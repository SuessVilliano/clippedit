import { expect, it } from "vitest";
import { cleanCoachText, guidedReply } from "../src/lib/coach";
it("removes model-generated URLs so navigation uses validated app actions",()=>{expect(cleanCoachText("Open https://invented.example/studio to continue")).toBe("Open (use the action button below) to continue");});
it("keeps fallback guidance honest about external payouts",()=>{expect(guidedReply("How do I get paid?")).toContain("does not currently process payouts");});
