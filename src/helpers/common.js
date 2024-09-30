export const mock = true;
export let auth = {
  username: "",
  password: ""
};
export const l = console.log.bind(window.console);
export const cl = console.clear.bind(window.console);
export const rand = length => {
  let chars =
      "M30Z1xA0Nu5Pn8Yo2pXqB5Rly9Gz3vWOj1Hm46IeCfgSrTs7Q9aJb8F6DcE7d2twkUhKiL4V",
    charLength = chars.length,
    randomStr = "";
  for (let i = 0; i < length; i++) {
    randomStr += chars[Math.floor(Math.random() * (charLength - 1))];
  }
  return randomStr;
};
export const sp = e => e && e.stopPropagation();
export const trimSpaces = string => {
  return string
    .replace(/&nbsp;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<");
};
// export const withIndex = arr => arr.map((v,i) => ({value: v, index: i}))
// export const getFormattedTime = date => {
//   if(date === null || typeof date === "undefined")
//     return ""
//
//   let arr = date.split('T')
//   return [arr[0], arr[1].split("+")[0]].join(" ")
// }
