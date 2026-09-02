import Link from "next/link";
import { ZootopiMark } from "@/components/zootopi-mark";

export function ZootopiBrand({ className = "" }: { className?: string }) {
  return <Link href="/" className={`zootopi-brand ${className}`} aria-label="주토피 홈">
    <span className="zootopi-brand__mascot"><ZootopiMark expression="smile" /></span>
    <span className="zootopi-brand__wordmark">주토피</span>
    <span className="zootopi-brand__spark" aria-hidden="true">✦</span>
  </Link>;
}
