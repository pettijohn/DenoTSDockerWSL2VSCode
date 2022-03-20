function bigIntAbs(n) {
    if (n >= 0n) {
        return n;
    }
    return n * -1n;
}
function getDecimals(n) {
    if (isNaN(n)) {
        throw new Error("InvalidNumber");
    }
    const [preDec, postDec] = _splitString(n.toString(), ".");
    return postDec.length;
}
function extractExp(n) {
    const [mul, expStr] = _splitString(n, "e");
    if (expStr === "") {
        return [
            n,
            0
        ];
    }
    const exp = parseInt(expStr, 10);
    if (isNaN(exp)) {
        throw new Error("InvalidNumber");
    }
    return [
        mul,
        exp
    ];
}
function countTrailingZeros(n, upTo) {
    if (n === 0n) {
        return 0;
    }
    let count = 0;
    let c = n < 0 ? n * -1n : n;
    while(c % 10n === 0n && count < upTo){
        count += 1;
        c = c / 10n;
    }
    return count;
}
function _splitString(input, __char) {
    const pos = input.indexOf(__char);
    if (pos === -1) {
        return [
            input,
            ""
        ];
    }
    const after = input.substr(pos + 1);
    if (after.indexOf(__char) !== -1) {
        throw new Error("InvalidNumber");
    }
    return [
        input.substr(0, pos),
        after
    ];
}
var BDCompare;
(function(BDCompare1) {
    BDCompare1[BDCompare1["Greater"] = 1] = "Greater";
    BDCompare1[BDCompare1["Less"] = -1] = "Less";
    BDCompare1[BDCompare1["Equal"] = 0] = "Equal";
})(BDCompare || (BDCompare = {
}));
class BigDenary {
    base;
    _decimals;
    constructor(n){
        if (n instanceof BigDenary) {
            this.base = n.base;
            this._decimals = n.decimals;
        } else if (typeof n === "number") {
            this._decimals = getDecimals(n);
            this.base = BigInt(n * Math.pow(10, this._decimals));
        } else if (typeof n === "string") {
            const [mul, exp] = extractExp(n);
            const mulDec = getDecimals(mul);
            if (exp > mulDec) {
                this.base = BigInt(mul.replace(".", "")) * BigInt(Math.pow(10, exp - mulDec));
                this._decimals = 0;
            } else {
                this.base = BigInt(mul.replace(".", ""));
                this._decimals = mulDec - exp;
            }
        } else if (typeof n === "bigint") {
            this.base = n * this.decimalMultiplier;
            this._decimals = 0;
        } else if (_isBigDenaryRaw(n)) {
            if (n.decimals < 0) {
                throw new Error("InvalidBigDenaryRaw");
            }
            this.base = n.base;
            this._decimals = n.decimals;
        } else {
            throw new Error("UnsupportedInput");
        }
        this.trimTrailingZeros();
    }
    toString() {
        if (this.base === 0n) {
            return "0";
        }
        const negative = this.base < 0;
        let base = this.base;
        if (negative) {
            base = base * -1n;
        }
        const baseStr = base.toString();
        const position = baseStr.length - this._decimals;
        let pre;
        let post;
        if (position < 0) {
            pre = "";
            post = `${_strOfZeros(position * -1)}${baseStr}`;
        } else {
            pre = baseStr.substr(0, position);
            post = baseStr.substr(position);
        }
        let result;
        if (pre.length === 0) {
            result = `0.${post}`;
        } else if (post.length === 0) {
            result = `${pre}`;
        } else {
            result = `${pre}.${post}`;
        }
        if (negative) {
            return `-${result}`;
        }
        return result;
    }
    valueOf() {
        return Number.parseFloat(this.toString());
    }
    toFixed(digits) {
        if (!digits) {
            return this.toString();
        }
        const temp = new BigDenary(this);
        temp.scaleDecimalsTo(digits);
        return temp.toString();
    }
    get decimals() {
        return this._decimals;
    }
    scaleDecimalsTo(_decimals) {
        if (_decimals > this._decimals) {
            this.base = this.base * BigDenary.getDecimalMultiplier(_decimals - this._decimals);
        } else if (_decimals < this._decimals) {
            const adjust = this._decimals - _decimals;
            const multiplier = BigDenary.getDecimalMultiplier(adjust);
            const remainder = this.base % multiplier;
            this.base = this.base / multiplier;
            if (bigIntAbs(remainder * 2n) >= multiplier) {
                if (this.base >= 0) {
                    this.base += 1n;
                } else {
                    this.base -= 1n;
                }
            }
        }
        this._decimals = _decimals;
    }
    get decimalMultiplier() {
        return BigDenary.getDecimalMultiplier(this._decimals);
    }
    static getDecimalMultiplier(decimals) {
        let multiplierStr = "1";
        for(let i = 0; i < decimals; i += 1){
            multiplierStr += "0";
        }
        return BigInt(multiplierStr);
    }
    trimTrailingZeros() {
        const trailingZerosCount = countTrailingZeros(this.base, this.decimals);
        if (trailingZerosCount > 0) {
            this.scaleDecimalsTo(this.decimals - trailingZerosCount);
        }
    }
    plus(operand) {
        const curr = new BigDenary(this);
        const oper = new BigDenary(operand);
        const targetDecs = Math.max(curr.decimals, oper.decimals);
        curr.scaleDecimalsTo(targetDecs);
        oper.scaleDecimalsTo(targetDecs);
        return new BigDenary({
            base: curr.base + oper.base,
            decimals: targetDecs
        });
    }
    minus(operand) {
        return this.plus(new BigDenary(operand).negated());
    }
    multipliedBy(operand) {
        const curr = new BigDenary(this);
        const oper = new BigDenary(operand);
        const targetDecs = curr.decimals + oper.decimals;
        return new BigDenary({
            base: curr.base * oper.base,
            decimals: targetDecs
        });
    }
    dividedBy(operand) {
        const MIN_DIVIDE_DECIMALS = 20;
        const curr = new BigDenary(this);
        const oper = new BigDenary(operand);
        const targetDecs = Math.max(curr.decimals * 2, oper.decimals * 2, 20);
        curr.scaleDecimalsTo(targetDecs);
        return new BigDenary({
            base: curr.base / oper.base,
            decimals: curr.decimals - oper.decimals
        });
    }
    negated() {
        return new BigDenary({
            base: this.base * -1n,
            decimals: this.decimals
        });
    }
    absoluteValue() {
        if (this.base >= 0n) {
            return this;
        }
        return this.negated();
    }
    comparedTo(comparator) {
        const curr = new BigDenary(this);
        const comp = new BigDenary(comparator);
        const targetDecs = Math.max(curr.decimals, comp.decimals);
        curr.scaleDecimalsTo(targetDecs);
        comp.scaleDecimalsTo(targetDecs);
        if (curr.base > comp.base) {
            return BDCompare.Greater;
        } else if (curr.base < comp.base) {
            return BDCompare.Less;
        }
        return BDCompare.Equal;
    }
    equals(comparator) {
        return this.comparedTo(comparator) === BDCompare.Equal;
    }
    greaterThan(comparator) {
        return this.comparedTo(comparator) === BDCompare.Greater;
    }
    greaterThanOrEqualTo(comparator) {
        return this.comparedTo(comparator) === BDCompare.Greater || this.comparedTo(comparator) === BDCompare.Equal;
    }
    lessThan(comparator) {
        return this.comparedTo(comparator) === BDCompare.Less;
    }
    lessThanOrEqualTo(comparator) {
        return this.comparedTo(comparator) === BDCompare.Less || this.comparedTo(comparator) === BDCompare.Equal;
    }
    add(operand) {
        return this.plus(operand);
    }
    sub(operand) {
        return this.minus(operand);
    }
    mul(operand) {
        return this.multipliedBy(operand);
    }
    div(operand) {
        return this.dividedBy(operand);
    }
    neg() {
        return this.negated();
    }
    abs() {
        return this.absoluteValue();
    }
    cmp(comparator) {
        return this.comparedTo(comparator);
    }
    eq(comparator) {
        return this.equals(comparator);
    }
    gt(comparator) {
        return this.greaterThan(comparator);
    }
    gte(comparator) {
        return this.greaterThanOrEqualTo(comparator);
    }
    lt(comparator) {
        return this.lessThan(comparator);
    }
    lte(comparator) {
        return this.lessThanOrEqualTo(comparator);
    }
}
function _isBigDenaryRaw(input) {
    return true;
}
function _strOfZeros(count) {
    let result = "";
    for(let i = 0; i < count; i += 1){
        result += "0";
    }
    return result;
}
function getMessage1() {
    return "Hello World!";
}
let i = new BigDenary(3n);
i = i.add(new BigDenary(1n));
console.log(i.toString());
export { getMessage1 as getMessage };
