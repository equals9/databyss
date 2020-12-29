import * as PouchDB from 'pouchdb-browser'
import { DbPage } from '../../interfaces'
import { db } from '../../db'
import { DocumentType } from '../../../interfaces/Block'

const fetchAllPages = async (): Promise<DbPage[]> => {
  const _pages: PouchDB.Find.FindResponse<DbPage> = await db.find({
    selector: {
      $type: DocumentType.Page,
    },
  })
  return _pages.docs
}

export default fetchAllPages
