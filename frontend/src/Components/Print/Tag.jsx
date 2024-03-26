import React, { useEffect, useState } from "react";
import { useReactToPrint } from "react-to-print";
import QRCode from "qrcode.react";

// Define convertToCode function outside of Tag component
function convertToCode(number) {
  const codeMap = {
    1: "J",
    2: "A",
    3: "I",
    4: "S",
    5: "U",
    6: "L",
    7: "T",
    8: "AB",
    9: "N",
  };

  // Round the number to the nearest multiple of 100
  var roundedNumber = Math.round(number / 100) * 100;

  while (roundedNumber % 10 === 0) {
    roundedNumber /= 10;
  }
  // Get the code corresponding to the rounded number
  var code = "";
  let st = roundedNumber.toString();
  for (let i = 0; i < st.length; i++) {
    code += codeMap[st[i]];
  }
  return code;
}

// Component representing a single tag with MRP and QR code
const Tag = ({ mrp, size, code }) => {
  return (
    <div
      style={{
        width: "50mm",
        height: "25mm",
        // border: "1px solid black",
        padding: 0,
        marginLeft: "1.3mm",
        marginRight: "1.3mm",
      }}
      className="flex justify-between"
    >
      <div className="p-2 pr-0">
        <QRCode value={code} size={75} />
      </div>
      <div className="relative font-bold">
        <div className="flex justify-center">
          <img src={`Images/Ganesha.jpg`} alt="project" width={"20mm"} />
        </div>
        <p>MRP: {mrp}/-</p>
        <p>Size: {size}</p>
        <div>
          <p className="absolute right-2 bottom-1 text-sm font-normal">
            {convertToCode(mrp)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Component representing the printable content with two tags
const PrintableContent = ({ items }) => {
  // console.log(items);
  // const componentRef = React.useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [buttonActive, setButtonActive] = useState(false);

  useEffect(() => {
    if (items.length > 0) {
      setButtonActive(true);
      setIsLoading(false); // Items are loaded
    } else {
      setButtonActive(false);
    }
  }, [items]);

  // Function to print the component
  const handlePrint = useReactToPrint({
    // content: () => componentRef.current,
  });

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="flex flex-wrap">
            {/* Map over the items and render Tag component for each */}
            {items.map((item, index) => (
              <Tag
                key={index}
                mrp={item.mrp}
                size={item.size}
                code={item.code}
              />
            ))}
          </div>
          <button
            onClick={handlePrint}
            disabled={!buttonActive}
            className={`w-full py-2 px-4 rounded focus:outline-none focus:shadow-outline-indigo active:bg-indigo-800 ${
              buttonActive
                ? "bg-indigo-500 text-white"
                : "bg-gray-300 text-black opacity-50 cursor-not-allowed"
            }`}
          >
            Print
          </button>
        </>
      )}
      
    </div>
  );
};

export default PrintableContent;
