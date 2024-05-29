import React from 'react'

export const useProvidedContext = <T>(context: React.Context<T | null>, name: string) => {
  const currentContext = React.useContext(context)

  if (currentContext === null) {
    throw new Error(`${name} provider context is missing`)
  }

  return currentContext
}
