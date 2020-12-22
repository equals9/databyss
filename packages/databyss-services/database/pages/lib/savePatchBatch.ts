import { PatchBatch } from '../../../interfaces/Patch'
import { DbPage } from '../../interfaces'
import { db } from '../../db'
import { runPatches } from '../util'

const savePatchData = async (data: PatchBatch) => {
  const { patches, id } = data
  console.log('PATHES', patches)
  const _page: DbPage = await db.get(id)
  if (!patches) {
    return
  }
  for (const patch of patches) {
    await runPatches(patch, _page)
  }
  console.log('UPSERT SAVE PAGE', _page)
  // save page
  await db.upsert(_page._id, () => _page)
}

export default savePatchData