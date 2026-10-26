import { Tor, type TorConfig } from "react-native-nitro-tor";

export async function startTorForLnd(config: TorConfig): Promise<string> {
  const tor = await Tor.daemon.start(config);
  // LND authenticates to Tor and manages its own persistent onion service.
  return `--tor.active --tor.socks=${tor.socksAddress} --tor.v3 --tor.control=${tor.controlAddress} --listen=localhost `;
}
