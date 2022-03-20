import { BigDenary } from "https://deno.land/x/bigdenary@1.0.0/mod.ts";

function getMessage(): string {
    return "Hello World!";
}

let i = new BigDenary(3n);
i = i.add(new BigDenary(1n));
console.log(i.toString());

export { getMessage };