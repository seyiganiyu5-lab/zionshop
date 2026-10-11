/** An IMEI is 15 digits whose last digit is a Luhn check digit. */
export function isValidImei(value: string) {
  if (!/^\d{15}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(value[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function cleanImei(value: string) {
  return value.replace(/[\s-]/g, "");
}
