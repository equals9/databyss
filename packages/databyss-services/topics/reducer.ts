import produce, { Draft } from 'immer'
import { FSA, TopicState, Topic, CacheDict, Block } from '../interfaces'
import { ResourcePending } from '../interfaces/ResourcePending'
import {
  FETCH_TOPIC,
  CACHE_TOPIC,
  FETCH_TOPIC_HEADERS,
  CACHE_TOPIC_HEADERS,
  REMOVE_PAGE_FROM_HEADER,
  ADD_PAGE_TO_HEADER,
} from './constants'

export const initialState: TopicState = {
  cache: {},
  headerCache: null,
}

export default produce((draft: Draft<TopicState>, action: FSA) => {
  let _headerCache: CacheDict<Topic> = {}
  if (
    draft.headerCache &&
    !(draft.headerCache instanceof ResourcePending) &&
    !(draft.headerCache instanceof Error)
  ) {
    _headerCache = draft.headerCache as CacheDict<Topic>
  }
  switch (action.type) {
    case FETCH_TOPIC: {
      draft.cache[action.payload.id] = new ResourcePending()
      break
    }
    case CACHE_TOPIC: {
      if (action.payload.topic instanceof Error) {
        draft.cache[action.payload.id] = action.payload.topic
        break
      }
      const _topic: Block = {
        ...action.payload.topic,
        type: 'TOPIC',
      }
      draft.cache[action.payload.id] = _topic
      // only populate header if header has been loaded
      if (draft.headerCache) {
        _headerCache[action.payload.id] = _topic
        draft.headerCache = _headerCache
      }
      break
    }
    case FETCH_TOPIC_HEADERS: {
      draft.headerCache = new ResourcePending()
      break
    }
    case CACHE_TOPIC_HEADERS: {
      if (action.payload.topics instanceof Error) {
        draft.headerCache = action.payload.topics
        break
      }
      action.payload.topics.forEach((topic: Topic) => {
        _headerCache[topic._id] = topic
      })
      draft.headerCache = _headerCache
      break
    }

    case REMOVE_PAGE_FROM_HEADER: {
      const _resource: any = _headerCache[action.payload.id]

      const _inPages: string[] = _resource?.isInPages
      if (_inPages) {
        const _index = _inPages.findIndex((p) => p === action.payload.pageId)
        if (_index > -1) {
          _resource?.isInPages.splice(_index, 1)
        }
      }

      break
    }
    case ADD_PAGE_TO_HEADER: {
      const _resource: any = _headerCache[action.payload.id]

      const _inPages: string[] = _resource?.isInPages
      if (_inPages) {
        const _index = _inPages.findIndex((p) => p === action.payload.pageId)
        if (_index < 0) {
          _resource?.isInPages.push(action.payload.pageId)
        }
      }

      break
    }
  }
})
