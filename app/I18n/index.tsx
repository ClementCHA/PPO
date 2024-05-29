'use client'

import React from 'react'


import { useProvidedContext } from '@/Helpers/contexts'
import { getStoredItem, storeItem } from '@/Helpers/local-storage'
import type { DotNestedKeys } from '@/Helpers/strings.js'

import frStrings from '@/I18n/Dictionaries/fr.json'
import Polyglot from './polyglot'
import enStrings from '@/I18n/Dictionaries/en.json'

type Dictionary = typeof frStrings

type I18NStringPaths = DotNestedKeys<Dictionary>

export const LOCALES = [
  'FR',
  'EN',
] as const

export type Locale = typeof LOCALES[number]

const DEFAULT_LOCALE: Locale = 'FR'  as const

export const localesMap: LocalesMap = {
  FR: {
    label: 'Français',
    dictionary: frStrings
  },
  EN: {
    label: 'English',
    dictionary: enStrings
  }
}

type LocaleInfo = {
  label: string
  dictionary: Dictionary
}

type LocalesMap = Record<Locale, LocaleInfo>

type I18nContextValue = {
  currentLocale: Locale
  i18n: (key: I18NStringPaths, options?: Record<string, unknown>) => string
  changeLocale: (newLocale: Locale) => void
}

const isLocale = (locale: string): locale is Locale => {
  return Object.keys(localesMap).includes(locale)
}

const I18nContext = React.createContext<I18nContextValue | null>(null)

export const I18nProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [currentLocale, setCurrentLocale] = React.useState<Locale>(DEFAULT_LOCALE)

  const currentDictionary = localesMap[currentLocale].dictionary

  const currentPolyglot = new Polyglot({
    phrases: currentDictionary as unknown as Record<string, string>
  })

  const changeLocale = (newLocale: Locale) => {
    if (!LOCALES.includes(newLocale)) {
      return
    }

    setCurrentLocale(newLocale)
    storeItem('locale', newLocale)
  }

  React.useEffect(() => {
    const storedLocale = getStoredItem('locale')

    if (storedLocale !== undefined) {
      setCurrentLocale(storedLocale)
      return
    }

    const navigatorLanguage = navigator.language.slice(0, 2).toUpperCase()

    if (isLocale(navigatorLanguage)) {
      setCurrentLocale(navigatorLanguage)
    }
  }, [])

  const i18n = (
    key: I18NStringPaths,
    options?: Record<string, unknown>
  ) => currentPolyglot.t(key, options)

  return (
    <I18nContext.Provider value={{ currentLocale, i18n, changeLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useProvidedContext(I18nContext, 'I18n')
