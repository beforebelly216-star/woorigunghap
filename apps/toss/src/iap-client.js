// Purchase stays unavailable until the server persists and grants the purchased entitlement.
// The grant callback must verify ownership/SKU and durable order/input binding on the server.
export function createIapClient({ sdk, grant }) {
  let cleanup = null;
  let active = false;
  let cancelled = false;
  const inFlight = new Map();
  const provide = (orderId, sku) => {
    if (!inFlight.has(orderId)) {
      const promise = Promise.resolve().then(() => grant({ orderId, sku })).then(result => result?.productGranted === true)
        .catch(() => false).finally(() => inFlight.delete(orderId));
      inFlight.set(orderId, promise);
    }
    return inFlight.get(orderId);
  };
  return {
    async recover() {
      const pending = await sdk.getPendingOrders();
      for (const order of pending.orders) {
        if (await provide(order.orderId, order.sku)) {
          const completed = await sdk.completeProductGrant({ params: { orderId: order.orderId } });
          if (!completed) throw new Error('상품 지급 확인을 완료하지 못했습니다. 다시 확인해 주세요.');
        }
      }
    },
    purchase(sku, onSuccess, onError) {
      if (active) throw new Error('이미 결제가 진행 중입니다.');
      if (!sku) throw new Error('상품 설정이 필요합니다.');
      active = true; cancelled = false;
      const finish = () => { active = false; cancelled = true; cleanup?.(); cleanup = null; };
      try {
        cleanup = sdk.createOneTimePurchaseOrder({ options: { sku, processProductGrant: ({ orderId }) => provide(orderId, sku) },
          onEvent: (event) => { finish(); if (event.type === 'success') onSuccess(event.data); },
          onError: (error) => { finish(); onError(error); } });
        if (cancelled) { cleanup?.(); cleanup = null; }
      } catch (error) { finish(); throw error; }
      return finish;
    },
  };
}
