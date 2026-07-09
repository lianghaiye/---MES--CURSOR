import { normalizeDiscountRate, round2 } from '@/utils/salesOrderPricing'
import { resolveFrameworkContractPrice } from '@/store/frameworkContractStore'

export const PRICE_LEVEL_OPTIONS = ['标准', 'VIP', '战略']

/**
 * 解析客户对某产品的协议价
 * @returns {{ listUnitPriceExTax: number, lineDiscountRate: number, priceSource: string }}
 */
export function resolveCustomerPrice(customer, productId, productCode, listPriceFromProduct = 0) {
  const listPrice = round2(Number(listPriceFromProduct) || 0)
  const defaultRate = normalizeDiscountRate(customer?.defaultDiscountRate, 1)

  if (!customer) {
    return {
      listUnitPriceExTax: listPrice,
      lineDiscountRate: 1,
      priceSource: 'product',
    }
  }

  const priceList = customer.customerPriceList || []
  const hit =
    priceList.find((item) => item.productId && item.productId === productId) ||
    priceList.find((item) => item.productCode && item.productCode === productCode)

  if (hit?.agreementUnitPriceExTax != null && hit.agreementUnitPriceExTax !== '') {
    const agreementPrice = round2(hit.agreementUnitPriceExTax)
    const baseList = listPrice > 0 ? listPrice : agreementPrice
    const rate = baseList > 0 ? round2(agreementPrice / baseList) : 1
    return {
      listUnitPriceExTax: baseList,
      lineDiscountRate: normalizeDiscountRate(rate, 1),
      priceSource: 'customer_agreement',
    }
  }

  if (hit?.agreementDiscountRate != null && hit.agreementDiscountRate !== '') {
    return {
      listUnitPriceExTax: listPrice,
      lineDiscountRate: normalizeDiscountRate(hit.agreementDiscountRate, defaultRate),
      priceSource: 'customer_agreement',
    }
  }

  return {
    listUnitPriceExTax: listPrice,
    lineDiscountRate: defaultRate,
    priceSource: defaultRate < 1 ? 'customer_agreement' : 'product',
  }
}

/** 客户协议价 + 框架合同价（合同优先覆盖） */
export function resolveSalesLinePrice({
  customer,
  contract,
  productId,
  productCode,
  listPriceFromProduct = 0,
}) {
  const customerPrice = resolveCustomerPrice(
    customer,
    productId,
    productCode,
    listPriceFromProduct,
  )
  if (!contract) return customerPrice

  const contractPrice = resolveFrameworkContractPrice(
    contract,
    productId,
    productCode,
    customerPrice.listUnitPriceExTax,
  )
  if (contractPrice.priceSource === 'contract') return contractPrice
  if (customerPrice.priceSource === 'customer_agreement') return customerPrice
  return contractPrice
}
