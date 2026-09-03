CREATE TABLE app_private."ContentAssetReference" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assetId" UUID NOT NULL,
  "testPartId" UUID,
  "stimulusId" UUID,
  "questionGroupId" UUID,
  "questionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentAssetReference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContentAssetReference_exactly_one_target_check" CHECK (num_nonnulls("testPartId", "stimulusId", "questionGroupId", "questionId") = 1),
  CONSTRAINT "ContentAssetReference_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES app_private."ContentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ContentAssetReference_testPartId_fkey" FOREIGN KEY ("testPartId") REFERENCES app_private."TestPart"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContentAssetReference_stimulusId_fkey" FOREIGN KEY ("stimulusId") REFERENCES app_private."Stimulus"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContentAssetReference_questionGroupId_fkey" FOREIGN KEY ("questionGroupId") REFERENCES app_private."QuestionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContentAssetReference_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES app_private."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContentAssetReference_assetId_idx" ON app_private."ContentAssetReference"("assetId");
CREATE INDEX "ContentAssetReference_testPartId_idx" ON app_private."ContentAssetReference"("testPartId");
CREATE INDEX "ContentAssetReference_stimulusId_idx" ON app_private."ContentAssetReference"("stimulusId");
CREATE INDEX "ContentAssetReference_questionGroupId_idx" ON app_private."ContentAssetReference"("questionGroupId");
CREATE INDEX "ContentAssetReference_questionId_idx" ON app_private."ContentAssetReference"("questionId");
CREATE UNIQUE INDEX "ContentAssetReference_asset_testPart_unique" ON app_private."ContentAssetReference"("assetId", "testPartId") WHERE "testPartId" IS NOT NULL;
CREATE UNIQUE INDEX "ContentAssetReference_asset_stimulus_unique" ON app_private."ContentAssetReference"("assetId", "stimulusId") WHERE "stimulusId" IS NOT NULL;
CREATE UNIQUE INDEX "ContentAssetReference_asset_group_unique" ON app_private."ContentAssetReference"("assetId", "questionGroupId") WHERE "questionGroupId" IS NOT NULL;
CREATE UNIQUE INDEX "ContentAssetReference_asset_question_unique" ON app_private."ContentAssetReference"("assetId", "questionId") WHERE "questionId" IS NOT NULL;

INSERT INTO app_private."ContentAssetReference" ("assetId", "testPartId")
SELECT asset.id, part.id FROM app_private."ContentAsset" asset
JOIN app_private."TestPart" part ON position('content-asset://' || asset."storageKey" IN coalesce(part."instructionsHtml", '')) > 0
ON CONFLICT DO NOTHING;

INSERT INTO app_private."ContentAssetReference" ("assetId", "stimulusId")
SELECT asset.id, stimulus.id FROM app_private."ContentAsset" asset
JOIN app_private."Stimulus" stimulus ON position('content-asset://' || asset."storageKey" IN coalesce(stimulus."bodyHtml", '')) > 0
ON CONFLICT DO NOTHING;

INSERT INTO app_private."ContentAssetReference" ("assetId", "questionGroupId")
SELECT asset.id, question_group.id FROM app_private."ContentAsset" asset
JOIN app_private."QuestionGroup" question_group ON (
  position('content-asset://' || asset."storageKey" IN coalesce(question_group."instructionsHtml", '')) > 0
  OR position('content-asset://' || asset."storageKey" IN coalesce(question_group."promptHtml", '')) > 0
)
ON CONFLICT DO NOTHING;

INSERT INTO app_private."ContentAssetReference" ("assetId", "questionId")
SELECT asset.id, question.id FROM app_private."ContentAsset" asset
JOIN app_private."Question" question ON position('content-asset://' || asset."storageKey" IN coalesce(question."promptHtml", '')) > 0
ON CONFLICT DO NOTHING;

ALTER TABLE app_private."ContentAsset"
  ADD CONSTRAINT "ContentAsset_storageKey_safe_check" CHECK (
    position('%' IN "storageKey") = 0
    AND position('_' IN "storageKey") = 0
    AND position('*' IN "storageKey") = 0
    AND position('?' IN "storageKey") = 0
    AND position('[' IN "storageKey") = 0
    AND position(']' IN "storageKey") = 0
    AND position(E'\\\\' IN "storageKey") = 0
    AND "storageKey" !~ '(^/|//|(^|/)\\.{1,2}(/|$))'
  ) NOT VALID;
