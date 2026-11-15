import React from "react";

const PickerItem = ({ label, value, enabled = true }) => {
  return React.createElement("option", { value, disabled: !enabled }, label ?? value);
};

const Picker = ({
  selectedValue,
  onValueChange,
  children,
  enabled = true,
  style,
  ...props
}) => {
  const onChange = (event) => {
    const { value, selectedIndex } = event.target;
    if (onValueChange) {
      onValueChange(value, selectedIndex);
    }
  };

  return React.createElement(
    "select",
    {
      value: selectedValue,
      disabled: !enabled,
      onChange,
      style,
      ...props,
    },
    children,
  );
};

Picker.Item = PickerItem;

export { Picker, PickerItem };

export default {
  Picker,
};
