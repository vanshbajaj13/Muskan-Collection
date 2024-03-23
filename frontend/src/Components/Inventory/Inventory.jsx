import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Doughnut, Bar } from "react-chartjs-2";
import "chart.js/auto";

const Inventory = () => {
  const navigate = useNavigate();
  const [inventoryData, setInventoryData] = useState([]);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [doughnutChartData, setDoughnutChartData] = useState([]);
  const [productChartData, setProductChartData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productSizesChartData, setProductSizesChartData] = useState([]);

  // Function to rearrange data and calculate total value for each brand
  const rearrangeBrandData = (data) => {
    const groupedData = data.reduce((acc, item) => {
      const brand = item.brand;

      // Check if the brand is already in the accumulator array
      const existingBrand = acc.find((group) => group.brand === brand);

      if (existingBrand) {
        // If the brand exists, update its totalValue
        existingBrand.quantityBuy += item.quantityBuy;
        existingBrand.quantitySold += item.quantitySold;
        existingBrand.totalValue +=
          (item.quantityBuy - item.quantitySold) * item.mrp;
      } else {
        // If the brand doesn't exist, add it to the accumulator array
        acc.push({
          brand,
          quantityBuy: item.quantityBuy,
          quantitySold: item.quantitySold,
          totalValue: (item.quantityBuy - item.quantitySold) * item.mrp,
        });
      }

      return acc;
    }, []);

    return groupedData;
  };

  // Function to rearrange data and calculate total value for each product
  const rearrangeProductData = (data) => {
    const groupedData = data.reduce((acc, item) => {
      const product = item.product;

      // Check if the product is already in the accumulator array
      const existingProduct = acc.find((group) => group.product === product);

      if (existingProduct) {
        // If the product exists, update its totalValue and totalPieces
        existingProduct.totalValue +=
          (item.quantityBuy - item.quantitySold) * item.mrp;
        existingProduct.totalPieces += item.quantityBuy - item.quantitySold;
        existingProduct.quantityBuy += item.quantityBuy;
        existingProduct.quantitySold += item.quantitySold;
      } else {
        // If the product doesn't exist, add it to the accumulator array
        acc.push({
          product,
          totalValue: (item.quantityBuy - item.quantitySold) * item.mrp,
          totalPieces: item.quantityBuy - item.quantitySold,
          quantityBuy: item.quantityBuy,
          quantitySold: item.quantitySold,
        });
      }

      return acc;
    }, []);

    return groupedData;
  };

  // Function to generate sizes data for the selected product
  const generateSizesChartData = (data) => {
    const sizesData = data.reduce((acc, item) => {
      const size = item.size;

      // Check if the size is already in the accumulator array
      const existingSize = acc.find((group) => group.size === size);

      if (existingSize) {
        // If the size exists, update its quantity
        existingSize.quantity += item.quantityBuy - item.quantitySold;
      } else {
        // If the size doesn't exist, add it to the accumulator array
        acc.push({
          size,
          quantity: item.quantityBuy - item.quantitySold,
        });
      }

      return acc;
    }, []);

    return sizesData;
  };

  // Fetch inventory data from the server
  const fetchInventoryData = async () => {
    try {
      const response = await fetch("/api/item", {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch inventory data");
        window.localStorage.clear();
        navigate("/login");
        return;
      }

      const data = await response.json();
      setInventoryData(data);

      // Rearrange data for Doughnut charts
      const rearrangedBrandData = rearrangeBrandData(data);
      const rearrangedProductData = rearrangeProductData(data);
      setDoughnutChartData(rearrangedBrandData);
      setProductChartData(rearrangedProductData);
      // Calculate total inventory value
      const totalValue = data.reduce(
        (sum, item) => sum + (item.quantityBuy - item.quantitySold) * item.mrp,
        0
      );
      setTotalInventoryValue(totalValue);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchInventoryData();
    // eslint-disable-next-line
  }, []);

  // Handle product selection
  const handleProductChange = (product) => {
    setSelectedProduct(product);

    // Fetch sizes data for the selected product
    const selectedProductData = inventoryData.filter(
      (item) => item.product === product
    );
    const sizesChartData = generateSizesChartData(selectedProductData);
    setProductSizesChartData(sizesChartData);
  };

  // Create data for Doughnut charts

  const generateRandomColors = (numColors) => {
    const colors = [
      "rgba(255, 99, 132, 0.7)",
      "rgba(54, 162, 235, 0.7)",
      "rgba(255, 206, 86, 0.7)",
      "rgba(75, 192, 192, 0.7)",
      "rgba(192, 192, 192, 0.7)",
    ];
    for (let i = 4; i < numColors; i++) {
      const randomColor = `rgba(${Math.floor(
        Math.random() * 256
      )}, ${Math.floor(Math.random() * 256)}, ${Math.floor(
        Math.random() * 256
      )}, 0.7)`;
      colors.push(randomColor);
    }
    return colors;
  };

  const brandChartData = {
    labels: doughnutChartData.map((item) => item.brand),
    datasets: [
      {
        data: doughnutChartData.map((item) => item.totalValue),
        backgroundColor: generateRandomColors(doughnutChartData.length),
        borderWidth: 1,
        label: "Worth",
      },
    ],
  };

  // Doughnut Chart for Product
  const doughnutProductChartData = {
    labels: productChartData.map((item) => item.product),
    datasets: [
      {
        data: productChartData.map((item) => item.quantityBuy),
        backgroundColor: generateRandomColors(productChartData.length),
        borderWidth: 1,
        label: "Quantity Buy",
      },
      {
        data: productChartData.map((item) => item.quantitySold),
        backgroundColor: generateRandomColors(productChartData.length).map(
          (color) => color.replace("0.7", "0.3")
        ), // Use lighter color for quantitySold
        borderWidth: 1,
        label: "Quantity Sold",
      },
    ],
  };

  // Chart data for sizes of the selected product
  const sizesChartData = {
    labels: productSizesChartData.map((item) => item.size),
    datasets: [
      {
        data: productSizesChartData.map((item) => item.quantity),
        backgroundColor: generateRandomColors(productSizesChartData.length),
        borderWidth: 1,
        label: "Quantity Available",
      },
    ],
  };

  //   chart for comparing brands

  const brandColorList = generateRandomColors(doughnutChartData.length);

  const comparingBrandData = {
    labels: doughnutChartData.map((item) => item.brand),
    datasets: [
      {
        data: doughnutChartData.map((item) => item.quantityBuy),
        backgroundColor: brandColorList,
        borderWidth: 1,
        label: "Quantity Buy",
      },
      {
        data: doughnutChartData.map((item) => item.quantitySold),
        backgroundColor: brandColorList.map((color) =>
          color.replace("0.7", "0.3")
        ), // Use lighter color for quantitySold
        borderWidth: 1,
        label: "Quantity Sold",
      },
    ],
  };

  return (
    <div className="p-4 bg-gray-100 rounded-md shadow-md">
      <h2 className="text-3xl font-bold mb-4">Inventory</h2>
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Total Inventory Value:</h3>
        <div className="text-xl font-bold">₹{totalInventoryValue}</div>
      </div>
      {/* Doughnut Chart for Brand */}
      <h3 className="text-lg font-semibold mb-2">Inventory by Brand</h3>
      <div className="flex items-center justify-center ">
        <div className="w-screen h-screen">
          <Doughnut
            data={brandChartData}
            options={{ maintainAspectRatio: false }}
          />
        </div>
      </div>
      {/* Doughnut Chart for Product */}
      <h3 className="text-lg font-semibold mb-2">Inventory by Product</h3>
      <div className="flex items-center justify-center">
        <div className="w-screen h-screen">
          <Doughnut
            data={doughnutProductChartData}
            options={{ maintainAspectRatio: false }}
          />
        </div>
      </div>
      <select
        value={selectedProduct}
        onChange={(e) => handleProductChange(e.target.value)}
        className="mt-4 p-2 border rounded"
      >
        <option value="" disabled>
          Select a Product
        </option>
        {productChartData.map((product) => (
          <option key={product.product} value={product.product}>
            {product.product}
          </option>
        ))}
      </select>

      {selectedProduct && (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Sizes and Quantity for {selectedProduct}
          </h3>
          <div className="flex items-center justify-center">
            <div className="w-auto">
              <Doughnut data={sizesChartData} height={100} />
            </div>
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">
        Quantity Bought and Sold by Brand
      </h3>
      <div className="flex items-center justify-center">
        <div className="w-screen h-screen">
          <Bar
            data={comparingBrandData}
            options={{ maintainAspectRatio: false }}
          />
        </div>
      </div>
    </div>
  );
};

export default Inventory;
