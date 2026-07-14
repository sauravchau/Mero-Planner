const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = phone.replace(/[^\d]/g, '');
  return /^[+\d][\d\s-]{6,16}$/.test(phone) && digits.length >= 7 && digits.length <= 15;
};

const isNotPastDate = (dateStr) => {
  if (!dateStr) return false;
  const inputDate = new Date(dateStr);
  if (isNaN(inputDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);
  return inputDate >= today;
};

const isPositiveNumber = (val) => {
  const n = Number(val);
  return !isNaN(n) && n > 0;
};

const isNonNegativeNumber = (val) => {
  const n = Number(val);
  return !isNaN(n) && n >= 0;
};

module.exports = { isValidPhone, isNotPastDate, isPositiveNumber, isNonNegativeNumber };
