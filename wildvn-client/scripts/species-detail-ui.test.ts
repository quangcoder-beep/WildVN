import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getStatusPresentation,
  getFirstCitationYear,
  taxonomyTrail,
  translateActivityPattern,
  translateDietType,
  translateHabitatTypes,
} from "../app/species/[slug]/_components/species-detail-utils";

test("status presentation never invents a conservation percentage", () => {
  assert.deepEqual(getStatusPresentation("NE"), {
    code: "NE",
    label: "Chưa đánh giá",
    description: "Chưa được đánh giá theo các tiêu chí của Sách Đỏ.",
    isAssessed: false,
  });
});

test("unknown status codes remain visible without a fake label", () => {
  assert.deepEqual(getStatusPresentation("LOCAL_REVIEW"), {
    code: "LOCAL_REVIEW",
    label: "LOCAL_REVIEW",
    description: "Thông tin tình trạng đang được cập nhật.",
    isAssessed: true,
  });
});

test("taxonomy trail is ordered from the root to the species", () => {
  const trail = taxonomyTrail(
    {
      id: "genus",
      rank: "GENUS",
      scientificName: "Panthera",
      parent: {
        id: "family",
        rank: "FAMILY",
        scientificName: "Felidae",
        parent: null,
      },
    },
    "Panthera tigris",
  );

  assert.deepEqual(trail.map((node) => node.scientificName), [
    "Felidae",
    "Panthera",
    "Panthera tigris",
  ]);
});

test("database enum values are translated and empty values stay honest", () => {
  assert.equal(translateDietType("CARNIVORE"), "Ăn thịt");
  assert.equal(translateHabitatTypes(["TERRESTRIAL", "CANOPY"]), "Trên cạn, Trên tán cây");
  assert.equal(translateActivityPattern("NOCTURNAL"), "Ban đêm");
  assert.equal(translateActivityPattern(null), "Chưa cập nhật");
});

test("citation year is optional instead of defaulting to a fake zero", () => {
  assert.equal(getFirstCitationYear("Linnaeus, 1758"), 1758);
  assert.equal(getFirstCitationYear("Không rõ"), null);
  assert.equal(getFirstCitationYear(null), null);
});
