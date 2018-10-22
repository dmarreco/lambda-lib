/**
 * Remove acentos de caracteres
 * @param  {String} stringComAcento [string que contem os acentos]
 * @return {String}                 [string sem acentos]
 */
exports.removeAccents = function(str) {
    var res = str;
    var mapaAcentosHex = {
        a : /[\xE0-\xE6]/g,
        A : /[\xC0-\xC6]/g,
        e : /[\xE8-\xEB]/g,
        E : /[\xC8-\xCB]/g,
        i : /[\xEC-\xEF]/g,
        I : /[\xCC-\xCF]/g,
        o : /[\xF2-\xF6]/g,
        O : /[\xD2-\xD6]/g,
        u : /[\xF9-\xFC]/g,
        U : /[\xD9-\xDC]/g,
        c : /\xE7/g,
        C : /\xC7/g,
        n : /\xF1/g,
        N : /\xD1/g,
    };

    for ( var letra in mapaAcentosHex ) {
        var expressaoRegular = mapaAcentosHex[letra];
        res = res.replace( expressaoRegular, letra );
    }

    return res;
};

exports.removeNonNumericChars = (str) => {
    if (typeof str != 'string') return undefined;
    return str.replace(/\D/g,'');
};

/**
 * Remove caracteres (./-) e espaços em branco de uma string de números
 * @param  {String} number [string que contem os caracteres]
 * @return {String}                 [string sem acentos]
 */
exports.digitsOnly = function(number) {
    return number.trim().replace(/[.()/-\s]/g, '');
};

exports.number2currency = function(value) {
    return value.toFixed(2)
        .replace('.', ',')
        .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
};
exports.currency2number = function(value) {
    return isNaN(value) == false 
        ? parseFloat(value) 
        : parseFloat(value.replace('R$','').replace('.','').replace(',','.').trim());
};

/**
 * Removes all line breaks and tabs
 * @param {string} string [string com valor a ser minificado]
 */
exports.minifyString = function (string) {
    return string.replace(/\r?\n|\r|\t|\s{2,}/g, '');
};

/*
 * Normalizes an object
 * This is used to translate third-party service responses to he pattern returned by Benie internal services.
 * Converts a subset of the object attributes to camel case, discarding attributes not in the subset.
 */
exports.normalizeObjectAttributes = function(obj, requiredFieldNames) {
    if (!obj) return obj;
    
    if(!requiredFieldNames) {
        requiredFieldNames = Object.keys(obj); //if requiredFields is undefined, apply to all attributes in object
    }

    var result= {};
    for(var i = 0; i < requiredFieldNames.length; i ++) {
        var sourceName = requiredFieldNames[i];
        var targetName = sourceName.toCamelCase();
        result[targetName] = (obj[sourceName] === '' ? undefined : obj[sourceName]);
    }
    return result;
};


exports.applyStringExtensions = function() {

    String.prototype.replaceAt=function(index, replacement) {
        return '' + this.substr(0, index) + replacement + this.substr(index + replacement.length);
    };

    String.prototype.toCamelCase = function() {
        if(isAlphaNumeric(this)) {
            let res = '' + this;
            return res.replaceAt(0, res[0].toLowerCase());
        }

        return this.toLowerCase()
            // Remove leading non alpha numeric characters
            .replace(/^[\W+_]+/g, '')
            // Replaces any remaining non alphanumeric characters or underscores(_) with a space 
            .replace( /[\W+_]+/g, ' ')
            // Uppercases the first character in each group immediately following a space 
            // (delimited by spaces) 
            .replace( /\s+(.)/g, function($1) { return $1.toUpperCase(); })
            // Removes spaces 
            .replace( /\s/g, '' );
    };
    
    String.prototype.replaceAll = String.prototype.replaceAll || function(needle, replacement) {
        return this.split(needle).join(replacement);
    };

    String.prototype.toAlphaNumeric = function() {
        return this.replace(/[^\w\s]/g, '');
    };

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };
};

function isAlphaNumeric(string) {
    return !(/.*[\W+_]+.*/).test(string);
}