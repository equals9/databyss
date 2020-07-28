import React, { useEffect } from 'react'

import { Block } from '@databyss-org/services/interfaces/'
import { isAtomicInlineType } from '@databyss-org/editor/lib/util'
import { EditorState } from '../../../databyss-editor/interfaces/index'
import { stateBlockToHtml } from '@databyss-org/editor/lib/slateUtils.js'

const getBlockPrefix = (type: string): string =>
  ({
    SOURCE: '@',
    TOPIC: '#',
  }[type])

export const getPagePath = (page: EditorState, pageName: string): string => {
  if (!page) {
    return ''
  }
  // TODO: bail on seleciton not being collapsed
  const _index = page.selection.anchor.index

  const _currentAtomics: Block[] = []

  // trim blocks to remove content after anchor
  const _blocks = [...page.blocks].reverse()
  _blocks.splice(0, _blocks.length - 1 - _index)

  _blocks.forEach(_block => {
    if (isAtomicInlineType(_block.type)) {
      // if atomic type is not found in our current atomics array, push to array
      const _idx = _currentAtomics.findIndex(b => b.type === _block.type)
      if (_idx < 0) {
        _currentAtomics.push(_block)
      }
    }
  })

  const _path: string[] = []
  // add page name as first path
  if (pageName) {
    _path.push(pageName)
  }
  _currentAtomics.reverse().forEach(_block => {
    _path.push(`${getBlockPrefix(_block.type)} ${stateBlockToHtml(_block)}`)
  })

  return _path.join(' / ')
}
