import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { resolveHospitableMode } from "./hospitable";

const original = process.env.NEXT_PUBLIC_HOSPITABLE_MODE;

function setEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_HOSPITABLE_MODE;
  else process.env.NEXT_PUBLIC_HOSPITABLE_MODE = value;
}

describe("resolveHospitableMode", () => {
  afterEach(() => setEnv(original));

  it("uses the content mode when the env var is unset", () => {
    setEnv(undefined);
    assert.equal(resolveHospitableMode("stub"), "stub");
    assert.equal(resolveHospitableMode("native"), "native");
  });

  it("lets a valid env value override content", () => {
    setEnv("hospitable");
    assert.equal(resolveHospitableMode("stub"), "hospitable");
    setEnv("native");
    assert.equal(resolveHospitableMode("stub"), "native");
    setEnv("stub");
    assert.equal(resolveHospitableMode("native"), "stub");
  });

  it("treats the old value `live` as `hospitable`", () => {
    setEnv("live");
    assert.equal(resolveHospitableMode("stub"), "hospitable");
  });

  it("ignores an unknown env value", () => {
    setEnv("production");
    assert.equal(resolveHospitableMode("stub"), "stub");
  });
});
