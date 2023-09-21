const UUID_ALPHABET_1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const UUID_ALPHABET_2 = UUID_ALPHABET_1 + '0123456789';

export function guid(): string {
  const chars = new Array(8);
  chars[0] = UUID_ALPHABET_1[randInt(UUID_ALPHABET_1.length)];

  for (let i = 1; i < chars.length; ++i) {
    chars[i] = UUID_ALPHABET_2[randInt(UUID_ALPHABET_2.length)];
  }

  return chars.join('');
}

export function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export type Timer = ((id: string) => void) & {
  times?: Record<string, number>;
};
