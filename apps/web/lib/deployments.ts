import arbitrumSepolia from "../../../deployments/arbitrumSepolia.json";
import mantleSepolia from "../../../deployments/mantleSepolia.json";

export const deployments = {
  arbitrumSepolia,
  mantleSepolia
} as const;

export type NetworkKey = keyof typeof deployments;

export function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTokenAmount(raw: string) {
  const value = Number(BigInt(raw) / 10n ** 18n);
  return new Intl.NumberFormat("en-US").format(value);
}
