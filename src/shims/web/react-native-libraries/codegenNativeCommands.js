const codegenNativeCommands = (config = {}) => {
  const commands = {};
  for (const command of config.supportedCommands ?? []) {
    commands[command] = () => {};
  }
  return commands;
};

export default codegenNativeCommands;
