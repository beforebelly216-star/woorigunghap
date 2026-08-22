from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if new in source:
        return
    if old not in source:
        raise RuntimeError(f"missing target in {path}: {old[:220]!r}")
    write(path, source.replace(old, new, 1))


replace_once(
    "src/lib/server-report-store.ts",
    '''    ON CONFLICT (payment_id) DO UPDATE SET
      order_json = CASE
        WHEN woorigunghap_order_records.payment_status = 'paid' THEN woorigunghap_order_records.order_json
        ELSE EXCLUDED.order_json
      END,
      access_token_hash = COALESCE(
        woorigunghap_order_records.access_token_hash,
        EXCLUDED.access_token_hash
      ),''',
    '''    ON CONFLICT (payment_id) DO UPDATE SET
      order_json = CASE
        WHEN woorigunghap_order_records.generation_status = 'deleted' THEN woorigunghap_order_records.order_json
        WHEN woorigunghap_order_records.payment_status = 'paid' THEN woorigunghap_order_records.order_json
        ELSE EXCLUDED.order_json
      END,
      access_token_hash = CASE
        WHEN woorigunghap_order_records.generation_status = 'deleted' THEN NULL
        ELSE COALESCE(
          woorigunghap_order_records.access_token_hash,
          EXCLUDED.access_token_hash
        )
      END,''',
)
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}
      AND access_token_hash IS NULL
    RETURNING payment_id''',
    '''    WHERE payment_id = ${paymentId}
      AND access_token_hash IS NULL
      AND generation_status <> 'deleted'
    RETURNING payment_id''',
)
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
      AND report_json IS NULL
      AND (
        generation_status <> 'generating'
        OR generation_started_at IS NULL
        OR generation_started_at < NOW() - INTERVAL '5 minutes'
      )''',
    '''    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
      AND report_json IS NULL
      AND generation_status <> 'deleted'
      AND (
        generation_status <> 'generating'
        OR generation_started_at IS NULL
        OR generation_started_at < NOW() - INTERVAL '5 minutes'
      )''',
)
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
    RETURNING payment_id
  `;
  return rows.length > 0;
}

export async function releaseOneToManyGeneration''',
    '''    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
      AND generation_status <> 'deleted'
    RETURNING payment_id
  `;
  return rows.length > 0;
}

export async function releaseOneToManyGeneration''',
)
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}
      AND report_json IS NULL
  `;
  return true;
}

export async function claimPaymentWebhook''',
    '''    WHERE payment_id = ${paymentId}
      AND report_json IS NULL
      AND generation_status = 'generating'
  `;
  return true;
}

export async function claimPaymentWebhook''',
)
replace_once(
    "src/lib/server-report-store.ts",
    '''    UPDATE woorigunghap_order_records
    SET report_json = ${JSON.stringify(next)}, updated_at = NOW()
    WHERE payment_id = ${paymentId}
    RETURNING payment_id''',
    '''    UPDATE woorigunghap_order_records
    SET report_json = ${JSON.stringify(next)}, updated_at = NOW()
    WHERE payment_id = ${paymentId}
      AND generation_status <> 'deleted'
    RETURNING payment_id''',
)
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
    RETURNING payment_id
  `;
  return rows.length > 0;
}''',
    '''    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
      AND generation_status <> 'deleted'
    RETURNING payment_id
  `;
  return rows.length > 0;
}''',
)
replace_once(
    "src/lib/account-report-store.ts",
    '''    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
    ON CONFLICT (payment_id) DO UPDATE SET''',
    '''    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
      AND generation_status <> 'deleted'
    ON CONFLICT (payment_id) DO UPDATE SET''',
)

# Static contract: deletion cannot be resurrected by stale write/recovery paths.
path = Path("scripts/day18-account-report-library-contract-test.ts")
source = path.read_text(encoding="utf-8")
marker = 'assert.match(serverStore, /generation_status <> \'deleted\'/);'
if marker not in source:
    anchor = "assert.match(serverStore, /payment_status = 'paid'/);"
    if anchor not in source:
        raise RuntimeError("server-store assertion anchor missing")
    source = source.replace(
        anchor,
        anchor + "\nassert.match(serverStore, /generation_status <> 'deleted'/);\nassert.match(serverStore, /generation_status = 'deleted'[\\s\\S]*access_token_hash[\\s\\S]*NULL/);\nassert.match(accountStore, /payment_status = 'paid'[\\s\\S]*generation_status <> 'deleted'/);",
        1,
    )
    path.write_text(source, encoding="utf-8")
