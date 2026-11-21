function handleCommand(command) {

    if (command.includes("show clock"))
      return "SHOW_CLOCK";

    if (command.includes("show weather"))
      return "SHOW_WEATHER";
  
    if (command.includes("show news"))
      return "SHOW_NEWS";
  
    if (command.includes("show stocks"))
      return "SHOW_STOCKS";
  
    if (command.includes("show all"))
      return "SHOW_ALL";

    if (command.includes("hide clock"))
      return "HIDE_CLOCK";

    if (command.includes("hide weather"))
      return "HIDE_WEATHER";

    if (command.includes("hide news"))
      return "HIDE_NEWS";

    if (command.includes("hide stocks"))
      return "HIDE_STOCKS";

    if (command.includes("hide all"))
      return "HIDE_ALL";
  
    return null;
  
  }
  
  module.exports = handleCommand;