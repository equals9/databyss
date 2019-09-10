import React from 'react'
import { Text, View } from '@databyss-org/ui/primitives'

export const Section = ({ children, title, ...others }) => (
  <View mb="medium" {...others}>
    <View mb="small">
      <Text variant="heading3" color="gray.3">
        {title}
      </Text>
    </View>
    {children}
  </View>
)