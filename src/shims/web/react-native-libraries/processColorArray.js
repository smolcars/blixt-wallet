import processColor from "./processColor";

const processColorArray = (colors) => {
  if (!Array.isArray(colors)) {
    return colors;
  }

  return colors.map((color) => processColor(color));
};

export default processColorArray;
