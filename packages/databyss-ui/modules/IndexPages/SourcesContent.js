import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import { CitationStyleOptions } from '@databyss-org/services/citations/constants'
import { createIndexPageEntries } from '@databyss-org/services/entries/util'
import { getCitationStyleOption } from '@databyss-org/services/citations/lib'
import { SourceCitationsLoader } from '@databyss-org/ui/components/Loaders'
import { useNavigationContext } from '@databyss-org/ui/components/Navigation/NavigationProvider/NavigationProvider'
import { useSourceContext } from '@databyss-org/services/sources/SourceProvider'
import { AuthorsContent } from './AuthorsContent'

import { DropDownControl, pxUnits, styled } from '../../primitives'

import { IndexPageContent } from './IndexPageContent'
import { SourcesResults } from './SourcesResults'

// styled components
const CitationStyleDropDown = styled(DropDownControl, () => ({
  width: pxUnits(120),
  alignSelf: 'end',
}))

// utils
const buildSortedSources = (sourceCitations) => {
  const sourcesData = Object.values(sourceCitations).map((value) =>
    createIndexPageEntries({
      id: value._id,
      text: value.text,
      citation: value.citation,
      type: 'sources',
    })
  )

  const sortedSources = sourcesData.sort((a, b) =>
    a.text.textValue.toLowerCase() > b.text.textValue.toLowerCase() ? 1 : -1
  )

  return sortedSources
}

export const SourcesContent = () => {
  const navigate = useNavigationContext((c) => c.navigate)

  const getQueryParams = useNavigationContext((c) => c.getQueryParams)

  const getPreferredCitationStyle = useSourceContext(
    (c) => c.getPreferredCitationStyle
  )
  const setPreferredCitationStyle = useSourceContext(
    (c) => c.setPreferredCitationStyle
  )
  const preferredCitationStyle = getPreferredCitationStyle()

  const [citationStyleOption, setCitationStyleOption] = useState(
    getCitationStyleOption(preferredCitationStyle)
  )

  const onCitationStyleChange = (value) => {
    setCitationStyleOption(value)
    setPreferredCitationStyle(value.id)
  }

  // if author is provided in the url `.../sources?firstName=''&lastName='' render authors
  const _queryParams = getQueryParams()
  if (_queryParams.length) {
    return <AuthorsContent query={_queryParams} />
  }

  // render methods
  const renderBody = (sources, navigate) => {
    const sortedSources = buildSortedSources(sources)

    const onSourceClick = (source) => navigate(`/sources/${source.id}`)

    return (
      <IndexPageContent title="All Sources" indexName="Sources">
        <Helmet>
          <meta charSet="utf-8" />
          <title>All Sources</title>
        </Helmet>
        <CitationStyleDropDown
          items={CitationStyleOptions}
          value={citationStyleOption}
          onChange={onCitationStyleChange}
        />
        <SourcesResults onClick={onSourceClick} entries={sortedSources} />
      </IndexPageContent>
    )
  }

  const render = () => (
    <SourceCitationsLoader filtered>
      {(source) => renderBody(source, navigate)}
    </SourceCitationsLoader>
  )

  return render()
}