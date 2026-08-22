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
        raise RuntimeError(f"missing target in {path}: {old[:180]!r}")
    write(path, source.replace(old, new, 1))


# A deleted paid report is intentionally irreversible. Stale tabs/recovery calls must not recreate it.
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
    '''      AND report_json IS NULL
      AND (
        generation_status <> 'generating' ''',
    '''      AND report_json IS NULL
      AND generation_status <> 'deleted'
      AND (
        generation_status <> 'generating' ''',
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
''',
    '''    WHERE payment_id = ${paymentId}
      AND report_json IS NULL
      AND generation_status = 'generating'
  `;
  return true;
}
''',
)
# updateProgress write guard.
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}
    RETURNING payment_id
  `;
  return result.length > 0;
}

export async function saveServerReportPrepared''',
    '''    WHERE payment_id = ${paymentId}
      AND generation_status <> 'deleted'
    RETURNING payment_id
  `;
  return result.length > 0;
}

export async function saveServerReportPrepared''',
)
# Segment write guard.
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
# Account claim itself must also ignore intentionally deleted records.
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

# Extend static account contract with irreversible-deletion guards.
replace_once(
    "scripts/day18-account-report-library-contract-test.ts",
    'assert.match(serverStore, /payment_status = \'paid\'/);',
    'assert.match(serverStore, /payment_status = \'paid\'/);\nassert.match(serverStore, /generation_status <> \'deleted\'/);\nassert.match(serverStore, /generation_status = \'deleted\'[\\s\\S]*access_token_hash[\\s\\S]*NULL/);\nassert.match(accountStore, /payment_status = \'paid\'[\\s\\S]*generation_status <> \'deleted\'/);',
)
