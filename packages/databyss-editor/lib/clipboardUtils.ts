import ObjectId from 'bson-objectid'
import cloneDeep from 'clone-deep'
import { BlockType } from '@databyss-org/services/interfaces'
import { Text, Range, Selection, EditorState, Block } from '../interfaces'
import { isAtomicInlineType } from './util'

interface BasicBlock {
  type: BlockType
  text: Text
}

interface SplitBlocks {
  before: BasicBlock | null
  after: BasicBlock | null
}

// returns before and after value for block split at index `offset`
const splitBlockAtOffset = ({
  block,
  offset,
}: {
  block: BasicBlock
  offset: number
}): SplitBlocks => {
  // if first block is atomic return
  if (isAtomicInlineType(block.type) || offset === 0) {
    return { before: null, after: { text: block.text, type: block.type } }
  }

  if (offset === block.text.textValue.length) {
    return { before: { text: block.text, type: block.type }, after: null }
  }

  let rangesForBlockBefore: Range[] = []
  let rangesForBlockAfter: Range[] = []

  block.text.ranges.forEach((r: Range) => {
    if (r.offset > offset) {
      rangesForBlockAfter.push({
        offset: r.offset - offset,
        length: r.length,
        marks: r.marks,
      })
    }
    if (r.offset < offset) {
      rangesForBlockBefore.push({
        offset: r.offset,
        length: offset - r.offset,
        marks: r.marks,
      })
      rangesForBlockAfter.push({
        offset: 0,
        length: r.length + r.offset - offset,
        marks: r.marks,
      })
    }
    if (r.offset === offset) {
      rangesForBlockAfter.push({
        offset: 0,
        length: r.length,
        marks: r.marks,
      })
    }
  })

  rangesForBlockBefore = rangesForBlockBefore.filter(r => r.length > 0)

  rangesForBlockAfter = rangesForBlockAfter.filter(r => r.length > 0)

  return {
    before: {
      text: {
        textValue: block.text.textValue.substring(0, offset),
        ranges: rangesForBlockBefore,
      },
      type: block.type,
    },
    after: {
      text: {
        textValue: block.text.textValue.substring(offset),
        ranges: rangesForBlockAfter,
      },
      type: block.type,
    },
  }
}

// checks is state selection is collapsed
export const isSelectionCollapsed = (selection: Selection): boolean => {
  const { anchor, focus } = selection
  return anchor.index === focus.index && anchor.offset === focus.offset
}

// return atomic or new id
const getId = (type: BlockType, id: string): string =>
  isAtomicInlineType(type) ? id : new ObjectId().toHexString()

// always have the anchor come before the focus
const sortSelection = (selection: Selection): Selection => {
  const { anchor, focus } = selection
  let _anchor = anchor
  let _focus = focus
  // always put anchor before focus
  if (anchor.index > focus.index) {
    _focus = [_anchor, (_anchor = _focus)][0]
  } else if (anchor.offset > focus.offset && anchor.index === focus.index) {
    _focus = [_anchor, (_anchor = _focus)][0]
  }

  return {
    anchor: _anchor,
    focus: _focus,
  }
}

// returns fragment in state selection
export const getCurrentSelection = (state: EditorState): Block[] => {
  if (isSelectionCollapsed(state.selection)) {
    return []
  }

  let frag: Block[] = []

  const { blocks, selection } = state

  const { anchor, focus } = sortSelection(selection)

  const _blocks = cloneDeep(blocks)

  // if selection is within the same block
  if (anchor.index === focus.index) {
    const _selectionLength = focus.offset - anchor.offset
    const _block = blocks[anchor.index]
    // split block at anchor offset and use `after`
    const _firstSplit = splitBlockAtOffset({
      block: _block,
      offset: anchor.offset,
    }).after

    // split block at length of selection and get `before`
    const _secondSplit = splitBlockAtOffset({
      block: _firstSplit || _block,
      offset: _selectionLength,
    }).before

    // if selection is use the first split
    const _frag = _secondSplit || _firstSplit

    if (_frag) {
      frag.push({ ..._frag, _id: getId(_frag.type, blocks[anchor.index]._id) })
    }
  }

  // if selection is more than one block
  if (anchor.index < focus.index) {
    // first block
    const { after: firstBlock } = splitBlockAtOffset({
      block: blocks[anchor.index],
      offset: anchor.offset,
    })

    if (firstBlock) {
      frag.push({
        ...firstBlock,
        _id: getId(firstBlock.type, blocks[anchor.index]._id),
      })
    }

    const _sliceLength = focus.index - anchor.index

    if (_sliceLength > 1) {
      _blocks.splice(anchor.index + 1, _sliceLength - 1).forEach((b: Block) => {
        frag.push({ text: b.text, type: b.type, _id: getId(b.type, b._id) })
      })
    }

    // get in between frags
    const { before: lastBlock } = splitBlockAtOffset({
      block: blocks[focus.index],
      offset: focus.offset,
    })

    if (lastBlock) {
      frag.push({
        ...lastBlock,
        _id: getId(lastBlock.type, blocks[focus.index]._id),
      })
    }
  }
  // add metadata
  frag = frag.map(b => ({ ...b, __showNewBlockMenu: false, __isActive: false }))

  return frag
}

const mergeBlocks = ({
  firstBlock,
  secondBlock,
}: {
  firstBlock: BasicBlock | Block
  secondBlock: BasicBlock | Block
}): BasicBlock => {
  const mergedTextValue = firstBlock.text.textValue + secondBlock.text.textValue

  const mergedRanges = [
    ...firstBlock.text.ranges,
    ...secondBlock.text.ranges.map((r: Range) => ({
      ...r,
      offset: r.offset + firstBlock.text.textValue.length,
    })),
  ].filter(r => r.length > 0)

  const mergedBlock = {
    text: {
      textValue: mergedTextValue,
      ranges: mergedRanges,
    },
    type: firstBlock.type,
  }

  return mergedBlock
}

export const insertBlockAtIndex = ({
  block,
  blockToInsert,
  index,
}: {
  block: Block
  blockToInsert: Block
  index: number
}): Block => {
  const splitBlock = splitBlockAtOffset({ block, offset: index })

  let mergedBlock
  if (splitBlock.before) {
    mergedBlock = mergeBlocks({
      firstBlock: splitBlock.before,
      secondBlock: blockToInsert,
    })
  }

  if (splitBlock.after) {
    mergedBlock = mergeBlocks({
      firstBlock: mergedBlock || blockToInsert,
      secondBlock: splitBlock.after,
    })
  }
  return mergedBlock
}

export const deleteBlocksAtSelection = ({
  state,
  draftState,
}: {
  state: EditorState
  draftState: EditorState
}) => {
  if (isSelectionCollapsed(draftState.selection)) {
    return
  }
  const { selection, blocks } = state
  const { anchor, focus } = sortSelection(selection)

  // console.log(JSON.stringify(draftState.blocks))

  // check if index spans over more than one block
  if (focus.index === anchor.index) {
    let _newBlock
    const _currentBlock = blocks[anchor.index]
    // if selection spans over entire block, delete block contents
    if (focus.offset - anchor.offset === _currentBlock.text.textValue.length) {
      console.log('WOW HERE')
      _newBlock = { text: { textValue: '', ranges: [] } }
    } else {
      // if not, split block at anchor offset
      const { before, after } = splitBlockAtOffset({
        block: _currentBlock,
        offset: anchor.offset,
      })

      let lastBlockFragment
      // if `after` exists, split `after` at focus offset - before block length
      if (after) {
        let { after: _lastBlockFragment } = splitBlockAtOffset({
          block: after,
          offset: focus.offset - anchor.offset,
        })
        lastBlockFragment = _lastBlockFragment
      }

      // take that result and merge it with `before` if `before` exists
      if (before && lastBlockFragment) {
        _newBlock = mergeBlocks({
          firstBlock: before,
          secondBlock: lastBlockFragment,
        })
      } else if (before) {
        _newBlock = before
      } else if (lastBlockFragment) {
        _newBlock = lastBlockFragment
      }
    }

    // replace block
    draftState.blocks[anchor.index] = {
      ...draftState.blocks[anchor.index],
      ..._newBlock,
    }
    // replace selection
    const _offset = anchor.offset
    const _index = anchor.index
    const _selection = {
      anchor: { offset: _offset, index: _index },
      focus: { offset: _offset, index: _index },
    }
    draftState.selection = _selection
    draftState.resetState = true
  }
  // TODO: if selection spans over multiple blocks

  // if `before`
  // split first block at anchor

  // if `before` set first half equal to anchor index

  // split last block at offset

  //if `after` set second half equal to focus index
}
