-- A bounded diagnostic track may be linked through ContentAssetReference only.
-- Preserve the reviewed asset facts without changing ordinary mock triggers.
CREATE FUNCTION app_private.diagnostic_audio_asset_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = app_private, pg_temp AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM app_private."DiagnosticContentReview" review
    WHERE review."audioAssetId" = OLD.id
  ) THEN
    RAISE EXCEPTION 'reviewed diagnostic audio is immutable; create a new asset and review'
      USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER diagnostic_audio_asset_immutable
BEFORE UPDATE OR DELETE ON app_private."ContentAsset"
FOR EACH ROW EXECUTE FUNCTION app_private.diagnostic_audio_asset_immutable();
REVOKE ALL ON FUNCTION app_private.diagnostic_audio_asset_immutable()
  FROM PUBLIC, anon, authenticated;
