type TestPartHeaderProps = {
  partNumber: number;
  instructionsHtml?: string | null;
};

export default function TestPartHeader({
  partNumber,
  instructionsHtml,
}: TestPartHeaderProps) {
  return (
    <header className="ielts-part-header">
      <h1>Part {partNumber}</h1>
      {instructionsHtml && (
        <div
          className="ielts-part-instructions"
          dangerouslySetInnerHTML={{ __html: instructionsHtml }}
        />
      )}
    </header>
  );
}
