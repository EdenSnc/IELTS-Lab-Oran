import Image from 'next/image';
import Link from 'next/link';

type TestBrandProps = {
  compact?: boolean;
  className?: string;
  inverse?: boolean;
  responsive?: boolean;
  href?: string;
};

export default function TestBrand({ compact = false, className = '', inverse = false, responsive = true, href }: TestBrandProps) {
  const content = (
    <>
      <Image
        src="/ielts-lab-mark.svg"
        alt=""
        aria-hidden="true"
        width={compact ? 28 : 42}
        height={compact ? 28 : 42}
        priority
        draggable={false}
        className="ielts-test-brand__logo"
      />
      <span className={inverse ? 'text-white' : 'text-black'}>
        <strong>IELTS Lab</strong>
        {!compact && <small>Oran</small>}
      </span>
    </>
  );
  const classNames = `ielts-test-brand ${href ? 'ielts-test-brand--linked' : ''} ${compact ? 'ielts-test-brand--compact' : ''} ${responsive ? 'ielts-test-brand--responsive' : ''} ${className}`.trim();
  return href ? <Link className={classNames} href={href} aria-label="IELTS Lab Oran home">{content}</Link> : <div className={classNames}>{content}</div>;
}
