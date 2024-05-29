'use strict'
const entries = Object.entries
const has = (o, arg) => {
  if (!o) return false
  return !!Object.getOwnPropertyDescriptor(o, arg)
}

const trim = (str) => str.trim()

const warn = function warn(message) {
  console.warn(message)
}

const replace = String.prototype.replace
const split = String.prototype.split

const delimiter = '||||'

const russianPluralGroups = function (n) {
  const lastTwo = n % 100
  const end = lastTwo % 10
  if (lastTwo !== 11 && end === 1) {
    return 0
  }
  if (end >= 2 && end <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    return 1
  }
  return 2
}

const defaultPluralRules = {
  pluralTypes: {
    arabic: function (n) {
      if (n < 3) {
        return n
      }
      const lastTwo = n % 100
      if (lastTwo >= 3 && lastTwo <= 10) return 3
      return lastTwo >= 11 ? 4 : 5
    },
    bosnian_serbian: russianPluralGroups,
    chinese: function () {
      return 0
    },
    croatian: russianPluralGroups,
    french: function (n) {
      return n >= 2 ? 1 : 0
    },
    german: function (n) {
      return n !== 1 ? 1 : 0
    },
    russian: russianPluralGroups,
    lithuanian: function (n) {
      if (n % 10 === 1 && n % 100 !== 11) {
        return 0
      }
      return n % 10 >= 2 && n % 10 <= 9 && (n % 100 < 11 || n % 100 > 19)
        ? 1
        : 2
    },
    czech: function (n) {
      if (n === 1) {
        return 0
      }
      return n >= 2 && n <= 4 ? 1 : 2
    },
    polish: function (n) {
      if (n === 1) {
        return 0
      }
      const end = n % 10
      return end >= 2 && end <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2
    },
    icelandic: function (n) {
      return n % 10 !== 1 || n % 100 === 11 ? 1 : 0
    },
    slovenian: function (n) {
      const lastTwo = n % 100
      if (lastTwo === 1) {
        return 0
      }
      if (lastTwo === 2) {
        return 1
      }
      if (lastTwo === 3 || lastTwo === 4) {
        return 2
      }
      return 3
    },
  },
  pluralTypeToLanguages: {
    arabic: ['ar'],
    bosnian_serbian: ['bs-Latn-BA', 'bs-Cyrl-BA', 'srl-RS', 'sr-RS'],
    chinese: [
      'id',
      'id-ID',
      'ja',
      'ko',
      'ko-KR',
      'lo',
      'ms',
      'th',
      'th-TH',
      'zh',
    ],
    croatian: ['hr', 'hr-HR'],
    german: [
      'fa',
      'da',
      'de',
      'en',
      'es',
      'fi',
      'el',
      'he',
      'hi-IN',
      'hu',
      'hu-HU',
      'it',
      'nl',
      'no',
      'pt',
      'sv',
      'tr',
    ],
    french: ['fr', 'tl', 'pt-br'],
    russian: ['ru', 'ru-RU'],
    lithuanian: ['lt'],
    czech: ['cs', 'cs-CZ', 'sk'],
    polish: ['pl'],
    icelandic: ['is'],
    slovenian: ['sl-SL'],
  },
}

function langToTypeMap(mapping) {
  const ret = {}
  entries(mapping).forEach(function (entry) {
    const type = entry[0]
    const langs = entry[1]
    langs.forEach(function (lang) {
      ret[lang] = type
    })
  })
  return ret
}

function pluralTypeName(pluralRules, locale) {
  const langToPluralType = langToTypeMap(pluralRules.pluralTypeToLanguages)
  return (
    langToPluralType[locale] ||
    langToPluralType[split.call(locale, /-/, 1)[0]] ||
    langToPluralType.en
  )
}

function pluralTypeIndex(pluralRules, pluralType, count) {
  return pluralRules.pluralTypes[pluralType](count)
}

function createMemoizedPluralTypeNameSelector() {
  const localePluralTypeStorage = {}

  return function (pluralRules, locale) {
    let pluralType = localePluralTypeStorage[locale]

    if (pluralType && !pluralRules.pluralTypes[pluralType]) {
      pluralType = null
      localePluralTypeStorage[locale] = pluralType
    }

    if (!pluralType) {
      pluralType = pluralTypeName(pluralRules, locale)

      if (pluralType) {
        localePluralTypeStorage[locale] = pluralType
      }
    }

    return pluralType
  }
}

function constructTokenRegex(opts) {
  const prefix = opts?.prefix || '%{'
  const suffix = opts?.suffix || '}'

  if (prefix === delimiter || suffix === delimiter) {
    throw new RangeError(
      '"' + delimiter + '" token is reserved for pluralization'
    )
  }

  return new RegExp(prefix + '(.*?)' + suffix, 'g')
}

const memoizedPluralTypeName = createMemoizedPluralTypeNameSelector()

const defaultTokenRegex = /%\{(.*?)\}/g

function transformPhrase(
  phrase,
  substitutions,
  locale,
  tokenRegex,
  pluralRules
) {
  if (typeof phrase !== 'string') {
    throw new TypeError(
      'Polyglot.transformPhrase expects argument #1 to be string'
    )
  }

  if (substitutions == null) {
    return phrase
  }

  let result = phrase
  const interpolationRegex = tokenRegex || defaultTokenRegex

  const options =
    typeof substitutions === 'number'
      ? { smart_count: substitutions }
      : substitutions

  if (options.smart_count != null && phrase) {
    const pluralRulesOrDefault = pluralRules || defaultPluralRules
    const texts = split.call(phrase, delimiter)
    const bestLocale = locale || 'en'
    const pluralType = memoizedPluralTypeName(pluralRulesOrDefault, bestLocale)
    const pluralTypeWithCount = pluralTypeIndex(
      pluralRulesOrDefault,
      pluralType,
      options.smart_count
    )

    result = trim(texts[pluralTypeWithCount] || texts[0])
  }

  result = replace.call(
    result,
    interpolationRegex,
    function (expression, argument) {
      if (!has(options, argument) || options[argument] == null) {
        return expression
      }
      return options[argument]
    }
  )

  return result
}

function Polyglot(options) {
  const opts = options || {}
  this.phrases = {}
  this.extend(opts.phrases || {})
  this.currentLocale = opts.locale || 'en'
  const allowMissing = opts.allowMissing ? transformPhrase : null
  this.onMissingKey =
    typeof opts.onMissingKey === 'function' ? opts.onMissingKey : allowMissing
  this.warn = opts.warn || warn
  this.tokenRegex = constructTokenRegex(opts.interpolation)
  this.pluralRules = opts.pluralRules || defaultPluralRules
}

Polyglot.prototype.locale = function (newLocale) {
  if (newLocale) this.currentLocale = newLocale
  return this.currentLocale
}

Polyglot.prototype.extend = function (morePhrases, prefix) {
  entries(morePhrases || {}).forEach(function (entry) {
    const key = entry[0]
    const phrase = entry[1]
    const prefixedKey = prefix ? prefix + '.' + key : key
    if (typeof phrase === 'object') {
      this.extend(phrase, prefixedKey)
    } else {
      this.phrases[prefixedKey] = phrase
    }
  }, this)
}

Polyglot.prototype.unset = function (morePhrases, prefix) {
  if (typeof morePhrases === 'string') {
    delete this.phrases[morePhrases]
  } else {
    entries(morePhrases || {}).forEach(function (entry) {
      const key = entry[0]
      const phrase = entry[1]
      const prefixedKey = prefix ? prefix + '.' + key : key
      if (typeof phrase === 'object') {
        this.unset(phrase, prefixedKey)
      } else {
        delete this.phrases[prefixedKey]
      }
    }, this)
  }
}

Polyglot.prototype.clear = function () {
  this.phrases = {}
}

Polyglot.prototype.replace = function (newPhrases) {
  this.clear()
  this.extend(newPhrases)
}

Polyglot.prototype.t = function (key, options) {
  let phrase, result
  const opts = options == null ? {} : options
  if (typeof this.phrases[key] === 'string') {
    phrase = this.phrases[key]
  } else if (typeof opts._ === 'string') {
    phrase = opts._
  } else if (this.onMissingKey) {
    const onMissingKey = this.onMissingKey
    result = onMissingKey(
      key,
      opts,
      this.currentLocale,
      this.tokenRegex,
      this.pluralRules
    )
  } else {
    this.warn('Missing translation for key: "' + key + '"')
    result = key
  }
  if (typeof phrase === 'string') {
    result = transformPhrase(
      phrase,
      opts,
      this.currentLocale,
      this.tokenRegex,
      this.pluralRules
    )
  }
  return result
}

Polyglot.prototype.has = function (key) {
  return has(this.phrases, key)
}

Polyglot.transformPhrase = function transform(phrase, substitutions, locale) {
  return transformPhrase(phrase, substitutions, locale)
}

export default Polyglot
