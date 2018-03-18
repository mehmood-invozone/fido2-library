const validator = require("../lib/validator");
const parser = require("../lib/parser");
var assert = require("chai").assert;
const h = require("fido2-helpers");
const {
    printHex,
    cloneObject
} = h.functions;

var attResp;
describe("attestation validation", function() {
    beforeEach(function() {
        attResp = {
            request: {},
            requiredExpectations: new Set([
                "origin",
                "challenge",
                "flags"
            ]),
            expectations: new Map([
                ["origin", "https://localhost:8443"],
                ["challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w"],
                ["flags", ["UP", "AT"]]
            ]),
            clientData: parser.parseClientResponse(h.lib.makeCredentialAttestationNoneResponse),
            authnrData: parser.parseAttestationObject(h.lib.makeCredentialAttestationNoneResponse.response.attestationObject)
        };
        var testReq = cloneObject(h.lib.makeCredentialAttestationNoneResponse);
        testReq.response.clientDataJSON = h.lib.makeCredentialAttestationNoneResponse.response.clientDataJSON.slice(0);
        testReq.response.attestationObject = h.lib.makeCredentialAttestationNoneResponse.response.attestationObject.slice(0);
        attResp.request = testReq;

        validator.attach(attResp);
    });

    it("returns object", function() {
        assert.isObject(validator);
    });

    it("is attached", function() {
        assert.isFunction(validator.attach);
        assert.isFunction(attResp.validateOrigin);
        assert.isFunction(attResp.validateAttestationSignature);
    });

    describe("validateExpectations", function() {
        it("returns true on valid expectations", function() {
            var ret = attResp.validateExpectations();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.validExpectations);
        });

        it("throws if expectations aren't found", function() {
            delete attResp.expectations;
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expectations should be of type Map");
        });

        it("throws if expectations aren't Map", function() {
            attResp.expectations = {};
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expectations should be of type Map");
        });

        it("throws if too many expectations", function() {
            attResp.expectations.set("foo", "bar");
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "wrong number of expectations: should have 3 but got 4");
        });

        it("throws if missing challenge", function() {
            attResp.expectations.delete("challenge");
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expectation did not contain value for 'challenge'");
        });

        it("throws if missing flags", function() {
            attResp.expectations.delete("flags");
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expectation did not contain value for 'flags'");
        });

        it("throws if missing origin", function() {
            attResp.expectations.delete("origin");
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expectation did not contain value for 'origin'");
        });

        it("throws if challenge is undefined", function() {
            attResp.expectations.set("challenge", undefined);
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expected challenge should be of type String, got: undefined");
        });

        it("throws if challenge isn't string", function() {
            attResp.expectations.set("challenge", { foo: "bar" });
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expected challenge should be of type String, got: object");
        });

        it("throws if challenge isn't base64 encoded string", function() {
            attResp.expectations.set("challenge", "miles&me");
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expected challenge should be properly encoded base64url String");
        });

        it("calls checkOrigin");

        it("returns true if flags is Set", function() {
            attResp.expectations.set("flags", new Set(["UP", "AT"]));
            var ret = attResp.validateExpectations();
            assert.isTrue(ret);
        });

        it("throws if Set contains non-string", function() {
            attResp.expectations.set("flags", new Set([3, "UP", "AT"]));
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expected flag unknown: 3");
        });

        it("throws if Array contains non-string", function() {
            attResp.expectations.set("flags", [3, "UP", "AT"]);
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expected flag unknown: 3");
        });

        it("throws on unknown flag", function() {
            attResp.expectations.set("flags", new Set(["foo", "UP", "AT"]));
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expected flag unknown: foo");
        });

        it("throws on undefined flag", function() {
            attResp.expectations.set("flags", new Set([undefined, "UP", "AT"]));
            assert.throws(() => {
                attResp.validateExpectations();
            }, Error, "expected flag unknown: undefined");
        });

        it("throws if counter is not a number");
        it("throws if counter is negative");
        it("throws if publicKey is not a string");
        it("throws if publicKey doesn't match PEM regexp");

        it("throws if requiredExpectations is undefined");
        it("throws if requiredExpectations is not Array or Set");
        it("passes if requiredExpectations is Array");
        it("passes if requiredExpectations is Set");
        it("throws if requiredExpectations field is missing");
        it("throws if more expectations were passed than requiredExpectations");
    });

    describe("validateCreateRequest", function() {
        it("returns true if request is valid", function() {
            var ret = attResp.validateCreateRequest();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.validRequest);
        });

        it("returns true for U2F request", function() {
            var ret = attResp.validateCreateRequest();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.validRequest);
        });

        it("throws if request is undefined", function() {
            attResp.request = undefined;
            assert.throws(() => {
                attResp.validateCreateRequest();
            }, TypeError, "expected request to be Object, got undefined");
        });

        it("throws if response field is undefined", function() {
            delete attResp.request.response;
            assert.throws(() => {
                attResp.validateCreateRequest();
            }, TypeError, "expected 'response' field of request to be Object, got undefined");
        });

        it("throws if response field is non-object", function() {
            attResp.request.response = 3;
            assert.throws(() => {
                attResp.validateCreateRequest();
            }, TypeError, "expected 'response' field of request to be Object, got number");
        });

        it("throws if id field is undefined", function() {
            delete attResp.request.id;
            assert.throws(() => {
                attResp.validateCreateRequest();
            }, TypeError, "expected 'id' field of request to be String, got undefined");
        });

        it("throws if id field is non-string", function() {
            attResp.request.id = [];
            assert.throws(() => {
                attResp.validateCreateRequest();
            }, TypeError, "expected 'id' field of request to be String, got object");
        });

        it("throws if response.attestationObject is undefined", function() {
            delete attResp.request.response.attestationObject;
            assert.throws(() => {
                attResp.validateCreateRequest();
            }, TypeError, "expected 'response.attestationObject' to be base64 String or ArrayBuffer");
        });

        it("throws if response.attestationObject is non-ArrayBuffer & non-String", function() {
            attResp.request.response.attestationObject = {};
            assert.throws(() => {
                attResp.validateCreateRequest();
            }, TypeError, "expected 'response.attestationObject' to be base64 String or ArrayBuffer");
        });

        it("passes with response.attestationObject as ArrayBuffer", function() {
            attResp.request.response.attestationObject = new ArrayBuffer();
            var ret = attResp.validateCreateRequest();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.validRequest);
        });

        it("passes with response.attestationObject as String", function() {
            attResp.request.response.attestationObject = "";
            var ret = attResp.validateCreateRequest();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.validRequest);
        });

        it("throws if response.clientDataJSON is undefined", function() {
            delete attResp.request.response.clientDataJSON;
            assert.throws(() => {
                attResp.validateCreateRequest();
            }, TypeError, "expected 'response.clientDataJSON' to be base64 String or ArrayBuffer");
        });

        it("throws if response.clientDataJSON is non-ArrayBuffer & non-String", function() {
            attResp.request.response.clientDataJSON = {};
            assert.throws(() => {
                attResp.validateCreateRequest();
            }, TypeError, "expected 'response.clientDataJSON' to be base64 String or ArrayBuffer");
        });

        it("passes with response.clientDataJSON as ArrayBuffer", function() {
            attResp.request.response.clientDataJSON = new ArrayBuffer();
            var ret = attResp.validateCreateRequest();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.validRequest);
        });

        it("passes with response.clientDataJSON as String", function() {
            attResp.request.response.clientDataJSON = "";
            var ret = attResp.validateCreateRequest();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.validRequest);
        });
    });

    describe("validateRawClientDataJson", function() {
        it("returns true if ArrayBuffer", function() {
            var ret = attResp.validateRawClientDataJson();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("rawClientDataJson"));
        });

        it("throws if missing", function() {
            attResp.clientData.delete("rawClientDataJson");
            assert.throws(() => {
                attResp.validateRawClientDataJson();
            }, Error, "clientData clientDataJson should be ArrayBuffer");
        });

        it("throws if not ArrayBuffer", function() {
            attResp.clientData.set("rawClientDataJson", "foo");
            assert.throws(() => {
                attResp.validateRawClientDataJson();
            }, Error, "clientData clientDataJson should be ArrayBuffer");
        });
    });

    describe("validateId", function() {
        it("returns true on ArrayBuffer", function() {
            var ret = attResp.validateId();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("id"));
        });

        it("throws on non-ArrayBuffer", function() {
            attResp.clientData.set("id", {});
            assert.throws(() => {
                attResp.validateId();
            }, Error, "expected id to be of type ArrayBuffer");
        });

        it("throws on undefined", function() {
            attResp.clientData.set("id", undefined);
            assert.throws(() => {
                attResp.validateId();
            }, Error, "expected id to be of type ArrayBuffer");
        });
    });

    describe("validateOrigin", function() {
        it("accepts exact match", function() {
            attResp.expectations.set("origin", "https://webauthn.bin.coffee:8080");
            attResp.clientData.set("origin", "https://webauthn.bin.coffee:8080");
            var ret = attResp.validateOrigin();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("origin"));
        });

        it("throws on port mismatch", function() {
            attResp.expectations.set("origin", "https://webauthn.bin.coffee:8080");
            attResp.clientData.set("origin", "https://webauthn.bin.coffee:8443");
            assert.throws(() => {
                attResp.validateOrigin();
            }, Error, "clientData origin did not match expected origin");
        });

        it("throws on domain mismatch", function() {
            attResp.expectations.set("origin", "https://webauthn.bin.coffee:8080");
            attResp.clientData.set("origin", "https://bin.coffee:8080");
            assert.throws(() => {
                attResp.validateOrigin();
            }, Error, "clientData origin did not match expected origin");
        });

        it("throws on protocol mismatch", function() {
            attResp.expectations.set("origin", "http://webauthn.bin.coffee:8080");
            attResp.clientData.set("origin", "https://webauthn.bin.coffee:8080");
            assert.throws(() => {
                attResp.validateOrigin();
            }, Error, "clientData origin did not match expected origin");
        });

        it("calls checkOrigin");
    });

    describe("checkOrigin", function() {});

    describe("validateCreateType", function() {
        it("returns true when 'webauthn.create'", function() {
            var ret = attResp.validateCreateType();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("type"));
        });

        it("throws when undefined", function() {
            attResp.clientData.set("type", undefined);
            assert.throws(() => {
                attResp.validateCreateType();
            }, Error, "clientData type should be 'webauthn.create'");
        });

        it("throws on 'webauthn.get'", function() {
            attResp.clientData.set("type", "webauthn.get");
            assert.throws(() => {
                attResp.validateCreateType();
            }, Error, "clientData type should be 'webauthn.create'");
        });

        it("throws on unknown string", function() {
            attResp.clientData.set("type", "asdf");
            assert.throws(() => {
                attResp.validateCreateType();
            }, Error, "clientData type should be 'webauthn.create'");
        });
    });

    describe("validateGetType", function() {
        it("returns true when 'webauthn.get'", function() {
            attResp.clientData.set("type", "webauthn.get");
            var ret = attResp.validateGetType();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("type"));
        });

        it("throws when undefined", function() {
            attResp.clientData.set("type", undefined);
            assert.throws(() => {
                attResp.validateGetType();
            }, Error, "clientData type should be 'webauthn.get'");
        });

        it("throws on 'webauthn.create'", function() {
            attResp.clientData.set("type", "webauthn.create");
            assert.throws(() => {
                attResp.validateGetType();
            }, Error, "clientData type should be 'webauthn.get'");
        });

        it("throws on unknown string", function() {
            attResp.clientData.set("type", "asdf");
            assert.throws(() => {
                attResp.validateGetType();
            }, Error, "clientData type should be 'webauthn.get'");
        });
    });

    describe("validateChallenge", function() {
        it("returns true if challenges match", function() {
            attResp.expectations.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w");
            var ret = attResp.validateChallenge();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("challenge"));
        });

        it("accepts ending equal sign (1)", function() {
            attResp.expectations.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w");
            attResp.clientData.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w=");
            var ret = attResp.validateChallenge();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("challenge"));
        });

        it("accepts ending equal signs (2)", function() {
            attResp.expectations.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w");
            attResp.clientData.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w==");
            var ret = attResp.validateChallenge();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("challenge"));
        });

        it("throws on three equal signs", function() {
            attResp.expectations.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w");
            attResp.clientData.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w===");
            assert.throws(() => {
                attResp.validateChallenge();
            }, Error, "clientData challenge was not properly encoded base64url");
        });

        it("does not remove equal sign from middle of string", function() {
            attResp.expectations.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w");
            attResp.clientData.set("challenge", "33EHav-jZ1v9qwH783aU-j0A=Rx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w");
            assert.throws(() => {
                attResp.validateChallenge();
            }, Error, "clientData challenge was not properly encoded base64url");
        });

        it("throws if challenge is not a string", function() {
            attResp.expectations.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w");
            attResp.clientData.set("challenge", ["foo"]);
            assert.throws(() => {
                attResp.validateChallenge();
            }, Error, "clientData challenge was not a string");
        });

        it("throws if challenge is base64url encoded", function() {
            attResp.expectations.set("challenge", "4BS1YJKRCeCVoLdfG_b66BuSQ-I2n34WsLFvy62fpIVFjrm32_tFRQixX9U8EBVTriTkreAp-1nDvYboRK9WFg");
            attResp.clientData.set("challenge", "4BS1YJKRCeCVoLdfG/b66BuSQ+I2n34WsLFvy62fpIVFjrm32/tFRQixX9U8EBVTriTkreAp+1nDvYboRK9WFg");
            assert.throws(() => {
                attResp.validateChallenge();
            }, Error, "clientData challenge was not properly encoded base64url");
        });

        it("throws if challenge is not base64 string", function() {
            attResp.expectations.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w");
            attResp.clientData.set("challenge", "miles&me");
            assert.throws(() => {
                attResp.validateChallenge();
            }, Error, "clientData challenge was not properly encoded base64url");
        });

        it("throws on undefined challenge", function() {
            attResp.expectations.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w");
            attResp.clientData.set("challenge", undefined);
            assert.throws(() => {
                attResp.validateChallenge();
            }, Error, "clientData challenge was not a string");
        });

        it("throws on challenge mismatch", function() {
            attResp.expectations.set("challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w");
            attResp.clientData.set("challenge", "4BS1YJKRCeCVoLdfG_b66BuSQ-I2n34WsLFvy62fpIVFjrm32_tFRQixX9U8EBVTriTkreAp-1nDvYboRK9WFg");
            assert.throws(() => {
                attResp.validateChallenge();
            }, Error, "clientData challenge mismatch");
        });
    });

    describe("validateRawAuthnrData", function() {
        it("returns true if ArrayBuffer", function() {
            var ret = attResp.validateRawAuthnrData();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("rawAuthnrData"));
        });

        it("throws if missing", function() {
            attResp.authnrData.delete("rawAuthnrData");
            assert.throws(() => {
                attResp.validateRawAuthnrData();
            }, Error, "authnrData rawAuthnrData should be ArrayBuffer");
        });

        it("throws if not ArrayBuffer", function() {
            attResp.authnrData.set("rawAuthnrData", "foo");
            assert.throws(() => {
                attResp.validateRawAuthnrData();
            }, Error, "authnrData rawAuthnrData should be ArrayBuffer");
        });
    });

    describe("validateAttestationSignature", function() {
        it("accepts none", function() {
            var ret = attResp.validateAttestationSignature();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("fmt"));
        });

        it("throws on unknown fmt", function() {
            assert.throws(() => {
                attResp.authnrData.set("fmt", "asdf");
                attResp.validateAttestationSignature();
            }, Error, "unknown clientData fmt: asdf");
        });

        it("throws on undefined fmt", function() {
            assert.throws(() => {
                attResp.authnrData.delete("fmt");
                attResp.validateAttestationSignature();
            }, Error, "unknown clientData fmt: undefined");
        });
    });

    describe("validateRpIdHash", function() {
        it("returns true when matches", function() {
            var ret = attResp.validateRpIdHash();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("rpIdHash"));
        });

        it("throws when it doesn't match", function() {
            attResp.clientData.set("origin", "https://google.com");
            assert.throws(() => {
                attResp.validateRpIdHash();
            }, Error, "authnrData rpIdHash mismatch");
        });

        it("throws when length mismatches", function() {
            attResp.authnrData.set("rpIdHash", new Uint8Array([1, 2, 3]).buffer);
            assert.throws(() => {
                attResp.validateRpIdHash();
            }, Error, "authnrData rpIdHash length mismatch");
        });
    });

    describe("validateAaguid", function() {
        it("returns true on validation", function() {
            var ret = attResp.validateAaguid();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("aaguid"));
        });

        it("throws if too short", function() {
            assert.throws(() => {
                attResp.authnrData.set("aaguid", new Uint8Array([1, 2, 3]).buffer);
                attResp.validateAaguid();
            }, Error, "authnrData AAGUID was wrong length");

        });
    });

    describe("validateCredId", function() {
        it("returns true when ArrayBuffer of correct length", function() {
            var ret = attResp.validateCredId();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("credId"));
            assert.isTrue(attResp.audit.journal.has("credIdLen"));
        });

        it("throws if length is undefined", function() {
            attResp.authnrData.delete("credIdLen");
            assert.throws(() => {
                attResp.validateCredId();
            }, Error, "authnrData credIdLen should be number, got undefined");
        });

        it("throws if length is not number", function() {
            attResp.authnrData.set("credIdLen", new Uint8Array());
            assert.throws(() => {
                attResp.validateCredId();
            }, Error, "authnrData credIdLen should be number, got object");
        });

        it("throws if length is wrong", function() {
            attResp.authnrData.set("credIdLen", 42);
            assert.throws(() => {
                attResp.validateCredId();
            }, Error, "authnrData credId was wrong length");
        });

        it("throws if credId is undefined", function() {
            attResp.authnrData.delete("credId");
            assert.throws(() => {
                attResp.validateCredId();
            }, Error, "authnrData credId should be ArrayBuffer");
        });

        it("throws if not array buffer", function() {
            attResp.authnrData.set("credId", "foo");
            assert.throws(() => {
                attResp.validateCredId();
            }, Error, "authnrData credId should be ArrayBuffer");
        });
    });

    describe("validatePublicKey", function() {
        it("returns true on validation", function() {
            var ret = attResp.validatePublicKey();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("credentialPublicKeyCose"));
            assert.isTrue(attResp.audit.journal.has("credentialPublicKeyJwk"));
            assert.isTrue(attResp.audit.journal.has("credentialPublicKeyPem"));
        });
    });

    describe("validateTokenBinding", function() {
        it("returns true if tokenBinding is undefined", function() {
            var ret = attResp.validateTokenBinding();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("tokenBinding"));
        });

        it("throws if tokenBinding is defined", function() {
            attResp.clientData.set("tokenBinding", "foo");
            assert.throws(() => {
                attResp.validateTokenBinding();
            }, Error, "Token binding not currently supported. Please submit a GitHub issue.");
        });
    });

    describe("validateFlags", function() {
        it("returns true on valid expectations", function() {
            var ret = attResp.validateFlags();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("flags"));
        });

        it("throws on invalid expectations", function() {
            attResp.expectations.set("flags", ["ED"]);
            assert.throws(() => {
                attResp.validateFlags();
            }, Error, "expected flag was not set: ED");
        });

        it("returns true on UP with UP-or-UV", function() {
            attResp.expectations.set("flags", ["UP-or-UV"]);
            attResp.authnrData.set("flags", new Set(["UP"]));
            var ret = attResp.validateFlags();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("flags"));
        });

        it("returns true on UV with UP-or-UV", function() {
            attResp.expectations.set("flags", ["UP-or-UV"]);
            attResp.authnrData.set("flags", new Set(["UV"]));
            var ret = attResp.validateFlags();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("flags"));
        });

        it("throws if UP-or-UV and neither is set", function() {
            attResp.expectations.set("flags", ["UP-or-UV"]);
            attResp.authnrData.set("flags", new Set(["ED"]));
            assert.throws(() => {
                attResp.validateFlags();
            }, Error, "expected User Presence (UP) or User Verification (UV) flag to be set and neither was");
        });

        it("throws if any of the RFU flags are set");
    });

    describe("validateInitialCounter", function() {
        it("returns true if valid", function() {
            var ret = attResp.validateInitialCounter();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.journal.has("counter"));
        });

        it("throws if not a number", function() {
            attResp.authnrData.set("counter", "foo");
            assert.throws(() => {
                attResp.validateInitialCounter();
            }, Error, "authnrData counter wasn't a number");
        });
    });

    describe("validateAudit for attestation", function() {
        it("returns on all internal checks passed", function() {
            attResp.validateExpectations();
            attResp.validateCreateRequest();
            // clientData validators
            attResp.validateRawClientDataJson();
            attResp.validateOrigin();
            attResp.validateCreateType();
            attResp.validateChallenge();
            attResp.validateTokenBinding();
            attResp.validateId();
            // authnrData validators
            attResp.validateRawAuthnrData();
            attResp.validateAttestationSignature();
            attResp.validateRpIdHash();
            attResp.validateAaguid();
            attResp.validateCredId();
            attResp.validatePublicKey();
            attResp.validateFlags();
            attResp.validateInitialCounter();

            // audit
            var ret = attResp.validateAudit();
            assert.isTrue(ret);
            assert.isTrue(attResp.audit.complete);
        });

        it("throws on untested verifies", function() {
            assert.throws(() => {
                attResp.validateAudit();
            }, Error, /^internal audit failed: .* was not validated$/);
        });

        it("throws on extra journal entries");

        it("throws on untested expectations");
        it("throws on untested request");
    });

    describe("validateAudit for assertion", function() {
        it("returns on all internal checks passed");
    });
});

describe("assertion validation", function() {
    beforeEach(function() {
        attResp = {
            request: {},
            requiredExpectations: new Set([
                "origin",
                "challenge",
                "flags"
            ]),
            expectations: new Map([
                ["origin", "https://localhost:8443"],
                ["challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w"],
                ["flags", ["UP", "AT"]]
            ]),
            clientData: parser.parseClientResponse(h.lib.makeCredentialAttestationNoneResponse),
            authnrData: parser.parseAttestationObject(h.lib.makeCredentialAttestationNoneResponse.response.attestationObject)
        };
        var testReq = cloneObject(h.lib.makeCredentialAttestationNoneResponse);
        testReq.response.clientDataJSON = h.lib.makeCredentialAttestationNoneResponse.response.clientDataJSON.slice(0);
        testReq.response.attestationObject = h.lib.makeCredentialAttestationNoneResponse.response.attestationObject.slice(0);
        attResp.request = testReq;

        validator.attach(attResp);
    });

    var assnResp;
    beforeEach(function() {
        assnResp = {
            request: {},
            requiredExpectations: new Set([
                "origin",
                "challenge",
                "flags",
                "counter",
                "publicKey"
            ]),
            expectations: new Map([
                ["origin", "https://localhost:8443"],
                ["challenge", "33EHav-jZ1v9qwH783aU-j0ARx6r5o-YHh-wd7C6jPbd7Wh6ytbIZosIIACehwf9-s6hXhySHO-HHUjEwZS29w"],
                ["flags", ["UP", "AT"]],
                ["counter", 300],
                ["publicKey", h.lib.assnPublicKey]
            ]),
            clientData: parser.parseClientResponse(h.lib.assertionResponse),
            authnrData: new Map([
                ...parser.parseAuthnrAssertionResponse(h.lib.assertionResponse)
            ])
        };
        var testReq = cloneObject(h.lib.assertionResponse);
        testReq.response.clientDataJSON = h.lib.assertionResponse.response.clientDataJSON.slice(0);
        testReq.response.authenticatorData = h.lib.assertionResponse.response.authenticatorData.slice(0);
        testReq.response.signature = h.lib.assertionResponse.response.signature.slice(0);
        testReq.response.userHandle = h.lib.assertionResponse.response.userHandle.slice(0);
        assnResp.request = testReq;

        validator.attach(assnResp);
    });

    describe("validateUserHandle", function() {
        it("returns true when undefined", function() {
            var ret = assnResp.validateUserHandle();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.journal.has("userHandle"));
        });

        it("throws if not undefined", function() {
            assnResp.authnrData.set("userHandle", "foo");
            assert.throws(() => {
                assnResp.validateUserHandle();
            }, Error, "unable to validate userHandle");
        });
    });

    describe("validateCounter", function() {
        it("returns true if counter has advanced", function() {
            assert.strictEqual(assnResp.authnrData.get("counter"), 363);
            assnResp.expectations.set("prevCounter", 362);
            var ret = assnResp.validateCounter();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.journal.has("counter"));
        });

        it("throws if counter is the same", function() {
            assert.strictEqual(assnResp.authnrData.get("counter"), 363);
            assnResp.expectations.set("prevCounter", 363);
            assert.throws(() => {
                assnResp.validateCounter();
            }, Error, "counter rollback detected");
        });

        it("throws if counter has rolled back", function() {
            assert.strictEqual(assnResp.authnrData.get("counter"), 363);
            assnResp.expectations.set("prevCounter", 364);
            assert.throws(() => {
                assnResp.validateCounter();
            }, Error, "counter rollback detected");
        });
    });

    describe("validateExpectations", function() {
        it("returns true on valid expectations");
    });

    describe("validateAssertionSignature", function() {
        it("returns true on valid signature");
    });

    describe("validateAssertionResponse", function() {
        it("returns true if request is valid", function() {
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });

        it("returns true for U2F request", function() {
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });

        it("throws if request is undefined", function() {
            assnResp.request = undefined;
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected request to be Object, got undefined");
        });

        it("throws if response field is undefined", function() {
            delete assnResp.request.response;
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'response' field of request to be Object, got undefined");
        });

        it("throws if response field is non-object", function() {
            assnResp.request.response = 3;
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'response' field of request to be Object, got number");
        });

        it("throws if id field is undefined", function() {
            delete assnResp.request.id;
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'id' field of request to be String, got undefined");
        });

        it("throws if id field is non-string", function() {
            assnResp.request.id = [];
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'id' field of request to be String, got object");
        });

        it("throws if response.signature is undefined", function() {
            delete assnResp.request.response.signature;
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'response.signature' to be base64 String or ArrayBuffer");
        });

        it("throws if response.signature is non-ArrayBuffer & non-String", function() {
            assnResp.request.response.signature = {};
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'response.signature' to be base64 String or ArrayBuffer");
        });

        it("passes with response.signature as ArrayBuffer", function() {
            assnResp.request.response.signature = new ArrayBuffer();
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });

        it("passes with response.signature as String", function() {
            assnResp.request.response.signature = "";
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });

        it("throws if response.authenticatorData is undefined", function() {
            delete assnResp.request.response.authenticatorData;
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'response.authenticatorData' to be base64 String or ArrayBuffer");
        });

        it("throws if response.authenticatorData is non-ArrayBuffer & non-String", function() {
            assnResp.request.response.authenticatorData = {};
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'response.authenticatorData' to be base64 String or ArrayBuffer");
        });

        it("passes with response.authenticatorData as ArrayBuffer", function() {
            assnResp.request.response.authenticatorData = new ArrayBuffer();
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });

        it("passes with response.authenticatorData as String", function() {
            assnResp.request.response.authenticatorData = "";
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });

        it("returns true if response.userHandle is undefined", function() {
            delete assnResp.request.response.userHandle;
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });

        it("throws if response.userHandle is non-ArrayBuffer & non-String", function() {
            assnResp.request.response.userHandle = {};
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'response.userHandle' to be base64 String, ArrayBuffer, or undefined");
        });

        it("passes with response.userHandle as ArrayBuffer", function() {
            assnResp.request.response.userHandle = new ArrayBuffer();
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });

        it("passes with response.userHandle as String", function() {
            assnResp.request.response.userHandle = "";
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });

        it("throws if response.clientDataJSON is undefined", function() {
            delete assnResp.request.response.clientDataJSON;
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'response.clientDataJSON' to be base64 String or ArrayBuffer");
        });

        it("throws if response.clientDataJSON is non-ArrayBuffer & non-String", function() {
            assnResp.request.response.clientDataJSON = {};
            assert.throws(() => {
                assnResp.validateAssertionResponse();
            }, TypeError, "expected 'response.clientDataJSON' to be base64 String or ArrayBuffer");
        });

        it("passes with response.clientDataJSON as ArrayBuffer", function() {
            assnResp.request.response.clientDataJSON = new ArrayBuffer();
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });

        it("passes with response.clientDataJSON as String", function() {
            assnResp.request.response.clientDataJSON = "";
            var ret = assnResp.validateAssertionResponse();
            assert.isTrue(ret);
            assert.isTrue(assnResp.audit.validRequest);
        });
    });
});