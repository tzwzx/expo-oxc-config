// ignorePatterns（ultracite core の **/*.generated.* 等）が効いていることを固定する。
// oxlint の extends は ignorePatterns をマージしないため共有設定で再宣言している。
// ここで指摘が出たら再宣言が失われている（2026-07 に実際に起きた事故）。
var thisWouldNormallyFail = 1;
console.log(thisWouldNormallyFail);
