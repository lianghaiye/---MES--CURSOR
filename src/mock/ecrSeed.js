import { buildMockEcnRecords } from '@/mock/ecnSeed'

export function buildMockEcrRecords() {
  return buildMockEcnRecords().map((row) => {
    const { ecnNo, id, ...rest } = row
    return {
      ...rest,
      id: id.replace(/^ecn-/, 'ecr-'),
      ecrNo: ecnNo?.replace(/^ECN-/, 'ECR-') || `ECR-${Date.now()}`,
    }
  })
}
