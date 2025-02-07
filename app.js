// Baudot code 5-bit charset

const baudotLS = {
  "0b00000": { char: null },
  "0b01000": { char: "\r" },
  "0b00010": { char: "\n" },
  "0b00100": { char: " " },
  "0b10111": { char: "Q" },
  "0b10011": { char: "W" },
  "0b00001": { char: "E" },
  "0b01010": { char: "R" },
  "0b10000": { char: "T" },
  "0b10101": { char: "Y" },
  "0b00111": { char: "U" },
  "0b00110": { char: "I" },
  "0b11000": { char: "O" },
  "0b10110": { char: "P" },
  "0b00011": { char: "A" },
  "0b00101": { char: "S" },
  "0b01001": { char: "D" },
  "0b01101": { char: "F" },
  "0b11010": { char: "G" },
  "0b10100": { char: "H" },
  "0b01011": { char: "J" },
  "0b01111": { char: "K" },
  "0b10010": { char: "L" },
  "0b10001": { char: "Z" },
  "0b11101": { char: "X" },
  "0b01110": { char: "C" },
  "0b11110": { char: "V" },
  "0b11001": { char: "B" },
  "0b01100": { char: "N" },
  "0b11100": { char: "M" },
  // This code tells the decoder to switch to FS mode.
  "0b11011": { shiftTo: "FS" },
};

const baudotFS = {
  "0b00000": { char: null },
  "0b01000": { char: "\r" },
  "0b00010": { char: "\n" },
  "0b00100": { char: " " },
  "0b10111": { char: "1" },
  "0b10011": { char: "2" },
  "0b00001": { char: "3" },
  "0b01010": { char: "4" },
  "0b10000": { char: "5" },
  "0b10101": { char: "6" },
  "0b00111": { char: "7" },
  "0b00110": { char: "8" },
  "0b11000": { char: "9" },
  "0b10110": { char: "0" },
  "0b00011": { char: "!" },
  "0b00101": { char: "@" },
  "0b01001": { char: "#" },
  "0b01101": { char: "$" },
  "0b11010": { char: "%" },
  "0b10100": { char: "&" },
  "0b01011": { char: "(" },
  "0b01111": { char: ")" },
  "0b10010": { char: "-" },
  "0b10001": { char: "/" },
  "0b11101": { char: ":" },
  "0b01110": { char: ";" },
  "0b11110": { char: "?" },
  "0b11001": { char: "," },
  "0b01100": { char: "." },
  "0b11100": { char: "'" },
  // This code tells the decoder to switch back to LS mode.
  "0b11111": { shiftTo: "LS" },
};

const createBaudotEnum = (map) => {
  const enumMap = {};
  Object.entries(map).forEach(([bitStr, mapping]) => {
    let key;
    if ("char" in mapping && mapping.char !== null) {
      // Use descriptive names for whitespace/control characters.
      switch (mapping.char) {
        case " ":
          key = "SPACE";
          break;
        case "\r":
          key = "CR";
          break;
        case "\n":
          key = "LF";
          break;
        default:
          key = mapping.char;
      }
    } else if ("shiftTo" in mapping) {
      key = `SHIFT_${mapping.shiftTo}`;
    }
    if (key) {
      // Convert the binary string (e.g., "0b01000") to a number.
      enumMap[key] = Number(bitStr);
    }
  });
  return enumMap;
};

// Build the enums for Letter Shift (LS) and Figure Shift (FS).
const BaudotEnum = {
  LS: createBaudotEnum(baudotLS),
  FS: createBaudotEnum(baudotFS),
};

console.log("Baudot Enum (LS):", BaudotEnum.LS);
console.log("Baudot Enum (FS):", BaudotEnum.FS, "\n");

const binaryToString = (num) => "0b" + num.toString(2).padStart(5, "0");

// Ensure a number is confined to 5 bits.
function to5Bit(num) {
  return num & 0b11111;
}

// Pack an array of 5-bit codes into a Uint16Array of 16-bit words.
const packCodes16 = (codes) => {
  // Calculate the total number of bits and the required number of 16-bit words.
  const totalBits = codes.length * 5;
  const wordCount = Math.ceil(totalBits / 16);
  const result = new Uint16Array(wordCount);

  let bitBuffer = 0;
  let bitCount = 0;
  let wordIndex = 0;

  for (let code of codes) {
    // Append the 5-bit code (masking to 5 bits is okay here)
    bitBuffer = (bitBuffer << 5) | to5Bit(code);
    bitCount += 5;

    // While we have at least 16 bits, extract a 16-bit word.
    while (bitCount >= 16) {
      const shift = bitCount - 16;
      const word = bitBuffer >> shift;
      result[wordIndex++] = word;
      bitBuffer = bitBuffer & ((1 << shift) - 1);
      bitCount = shift;
    }
  }

  // If bits remain, pad to form the final 16-bit word.
  if (bitCount > 0) {
    const word = bitBuffer << (16 - bitCount);
    result[wordIndex++] = word;
  }

  return result;
};

// Unpack an array of 16-bit numbers (Uint16Array) back into an array of 5-bit codes.
// 'codeCount' is the number of codes originally packed.
const unpackCodes16 = (packedArray, codeCount) => {
  const codes = [];
  let bitBuffer = 0;
  let bitCount = 0;

  for (let word of packedArray) {
    // Append the full 16-bit word
    bitBuffer = (bitBuffer << 16) | word;
    bitCount += 16;

    // While there are at least 5 bits, extract a code.
    while (bitCount >= 5 && codes.length < codeCount) {
      const shift = bitCount - 5;
      const code = bitBuffer >> shift;
      codes.push(code);
      bitBuffer = bitBuffer & ((1 << shift) - 1);
      bitCount = shift;
    }
  }

  return codes;
};

const decodeBaudot = (codes) => {
  let mode = "LS"; // Start in Letter Shift mode.
  let output = "";

  codes.forEach((code) => {
    const bin = binaryToString(code); // For example, "0b11011"
    // Choose the current mapping based on the mode.
    const mapping = mode === "LS" ? baudotLS[bin] : baudotFS[bin];

    if (!mapping) {
      output += "?";
    } else if (mapping.shiftTo) {
      // This is a shift command: update the mode.
      mode = mapping.shiftTo;
    } else if ("char" in mapping) {
      // Append the character.
      output += mapping.char;
    }
  });

  return output;
};

const messageCodes = [
  BaudotEnum.LS.T, // T (LS)
  BaudotEnum.LS.E, // E (LS)
  BaudotEnum.LS.S, // S (LS)
  BaudotEnum.LS.T, // T (LS)
  BaudotEnum.LS.SPACE, // space (LS)
  BaudotEnum.LS.SHIFT_FS, // shift to FS (LS): switch to figures
  BaudotEnum.FS["1"], // 1 (FS)
  BaudotEnum.FS["2"], // 2 (FS)
  BaudotEnum.FS["3"], // 3 (FS)
];

console.log("Original Baudot codes:");
messageCodes.forEach((code, index) => {
  console.log(`Code ${index}:`, binaryToString(code));
});

// Pack the 5-bit codes into a Uint16Array of 16-bit words.
const packed16 = packCodes16(messageCodes);
console.log("\nPacked 16-bit words:");
packed16.forEach((word, index) => {
  console.log(`Word ${index}:`, word.toString(2).padStart(16, "0"));
});

// Unpack the 16-bit words back into 5-bit codes.
const unpacked = unpackCodes16(packed16, messageCodes.length);
console.log("\nUnpacked Baudot codes:");
unpacked.forEach((code, index) => {
  console.log(`Code ${index}:`, binaryToString(code));
});

// Decode the Baudot message.
const decodedMessage = decodeBaudot(unpacked);
console.log("\nDecoded Message:", decodedMessage);
console.log("\nMax value of 5 bits:", binaryToString(31), to5Bit(31));
