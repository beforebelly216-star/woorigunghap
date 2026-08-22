from pathlib import Path

path = Path("scripts/day18-account-report-library-contract-test.ts")
source = path.read_text(encoding="utf-8")
old = 'const claimSection = accountStore.slice(accountStore.indexOf("export async function claimAccountReport"), accountStore.indexOf("export async function deleteAccountAndScrubReports"));'
new = 'const claimSection = accountStore.slice(accountStore.indexOf("export async function claimAccountReport"), accountStore.indexOf("export async function deleteOwnedAccountReport"));'
if old in source:
    source = source.replace(old, new, 1)
elif new not in source:
    raise RuntimeError("claim section test boundary not found")
path.write_text(source, encoding="utf-8")
