/**
 * Apex Stub Generator - Pure Vanilla JavaScript Library
 * 
 * Usage:
 *   const stubs = generateApexStubs(jsonData);
 *   // Returns: [{ filename: "MyClass.cls", source: "public class MyClass { ... }" }, ...]
 */

// Modifiers to skip (internal/compiler flags)
const SKIP_MODIFIERS = new Set(['explicitStatementExecuted']);

// Apex visibility modifiers in order of precedence
const VISIBILITY_MODIFIERS = ['global', 'public', 'protected', 'private'];

// Non-visibility modifiers
const OTHER_MODIFIERS = ['static', 'final', 'abstract', 'virtual', 'override', 'testMethod', 'webService', 'transient'];
const APEX_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Demangle encoded type strings
 * Converts: $$l -> <, $$r -> >, $$c -> ,
 * Also handles _0, _1 etc. parameter position markers
 */
function demangleType(encoded) {
    if (!encoded) return encoded;
    
    return encoded
        .replace(/\$\$l/g, '<')      // $$l -> <
        .replace(/\$\$r_\d+/g, '>')  // $$r_0, $$r_1, etc. -> >
        .replace(/\$\$r/g, '>')      // $$r -> >
        .replace(/\$\$c/g, ', ');    // $$c -> ,
}

/**
 * Demangle a method name that may contain encoded return type info
 * Pattern: methodName_rReturnType$$lGenericParam$$r...
 * Returns: { cleanName: string, genericReturnType: string | null }
 */
function demangleMethodName(mangledName) {
    // Only decode names containing the API's generic return-type encoding.
    // A regular method name can legitimately contain `_r` followed by a capital letter.
    const match = mangledName.match(/^(.+?)_r([A-Z].*\$\$l.*)$/);
    
    if (!match) {
        return { cleanName: mangledName, genericReturnType: null };
    }
    
    const cleanName = match[1];
    let typeInfo = match[2];
    
    // Check if there's generic type info
    if (typeInfo.includes('$$l')) {
        // Extract the base type and generic params
        // e.g., "List$$lSObject$$r_0String" -> "List<SObject>"
        // The part after $$r_N is parameter type info, not part of return type
        
        let depth = 0;
        let returnTypeEnd = -1;
        for (let index = 0; index < typeInfo.length - 2; index++) {
            const token = typeInfo.slice(index, index + 3);
            if (token === '$$l') {
                depth++;
                index += 2;
            } else if (token === '$$r') {
                depth--;
                index += 2;
                if (depth === 0) {
                    returnTypeEnd = index + 1;
                    break;
                }
            }
        }

        if (returnTypeEnd !== -1) {
            const returnTypePart = typeInfo.slice(0, returnTypeEnd);
            const demangled = demangleType(returnTypePart);
            return { cleanName, genericReturnType: demangled };
        }
    }
    
    // No generics, but still has _r prefix - just use the base type from JSON
    return { cleanName, genericReturnType: null };
}

/**
 * Format a type reference including namespace prefix if present
 */
function formatType(typeRef) {
    if (!typeRef || !typeRef.name) return 'Object';
    const prefix = typeRef.namespacePrefix ? `${typeRef.namespacePrefix}.` : '';
    return `${prefix}${typeRef.name}`;
}

/**
 * Filter and sort modifiers for output
 */
function formatModifiers(modifiers) {
    if (!modifiers || modifiers.length === 0) return [];
    
    const filtered = modifiers.filter(m => !SKIP_MODIFIERS.has(m));
    
    // Sort: visibility first, then other modifiers
    const visibility = filtered.filter(m => VISIBILITY_MODIFIERS.includes(m));
    const others = filtered.filter(m => OTHER_MODIFIERS.includes(m));
    const remaining = filtered.filter(m => 
        !VISIBILITY_MODIFIERS.includes(m) && !OTHER_MODIFIERS.includes(m)
    );
    
    return [...visibility, ...others, ...remaining];
}

/**
 * Format a single annotation (can be string or object with name/parameters)
 */
function formatAnnotation(ann) {
    // Simple string annotation
    if (typeof ann === 'string') {
        return ann;
    }
    
    // Object annotation with name and optional parameters
    if (ann && typeof ann === 'object' && ann.name) {
        if (!APEX_IDENTIFIER.test(ann.name)) {
            throw new Error(`Invalid annotation name: ${ann.name}`);
        }
        let result = ann.name;
        
        // Add parameters if present and non-empty
        if (ann.parameters && !Array.isArray(ann.parameters) && typeof ann.parameters === 'object') {
            const params = Object.entries(ann.parameters)
                .filter(([key, value]) => value !== null && value !== undefined)
                .map(([key, value]) => {
                    if (!APEX_IDENTIFIER.test(key)) {
                        throw new Error(`Invalid annotation parameter name: ${key}`);
                    }
                    return `${key}=${formatAnnotationValue(value)}`;
                })
                .join(', ');
            
            if (params) {
                result += `(${params})`;
            }
        }
        
        return result;
    }
    
    return String(ann);
}

function formatAnnotationValue(value) {
    if (typeof value === 'boolean') {
        return String(value);
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid annotation value: ${value}`);
        }
        return String(value);
    }

    if (typeof value !== 'string') {
        throw new Error(`Invalid annotation value: ${value}`);
    }

    if (/^(true|false|-?(?:0|[1-9]\d*)(?:\.\d+)?)$/i.test(value)) {
        return value;
    }

    return `'${value
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')}'`;
}

/**
 * Format annotations
 */
function formatAnnotations(annotations, indent = '') {
    if (!annotations || annotations.length === 0) return '';
    return annotations.map(ann => `${indent}@${formatAnnotation(ann)}\n`).join('');
}

/**
 * Get the default return value for a type
 */
function getDefaultReturn(typeName) {
    if (!typeName) return 'null';
    
    const lowerType = typeName.toLowerCase();
    
    // void returns nothing
    if (lowerType === 'void') return null;
    
    // Primitives
    if (lowerType === 'boolean') return 'false';
    if (lowerType === 'integer' || lowerType === 'int') return '0';
    if (lowerType === 'long') return '0L';
    if (lowerType === 'double' || lowerType === 'decimal') return '0.0';
    
    // Everything else returns null
    return 'null';
}

/**
 * Generate field declaration
 */
function generateField(field, indent = '    ') {
    const annotations = formatAnnotations(field.annotations, indent);
    const modifiers = formatModifiers(field.modifiers);
    const modStr = modifiers.length > 0 ? modifiers.join(' ') + ' ' : '';
    const type = formatType(field.type);
    const initializer = field.initializer ? ` = ${field.initializer}` : '';
    
    return `${annotations}${indent}${modStr}${type} ${field.name}${initializer};`;
}

/**
 * Generate property declaration
 */
function generateProperty(property, indent = '    ') {
    const annotations = formatAnnotations(property.annotations, indent);
    const modifiers = formatModifiers(property.modifiers);
    const modStr = modifiers.length > 0 ? modifiers.join(' ') + ' ' : '';
    const type = property.type ? formatType(property.type) : 'Object';
    
    let getterStr = '';
    let setterStr = '';
    
    if (property.getter) {
        const getterMods = formatModifiers(property.getter.modifiers)
            .filter(m => !modifiers.includes(m));
        const getterModStr = getterMods.length > 0 ? getterMods.join(' ') + ' ' : '';
        
        if (property.getter.hasBody) {
            const returnVal = getDefaultReturn(type);
            const returnStmt = returnVal !== null ? ` return ${returnVal}; ` : '';
            getterStr = `${getterModStr}get {${returnStmt}}`;
        } else {
            getterStr = `${getterModStr}get;`;
        }
    }
    
    if (property.setter) {
        const setterMods = formatModifiers(property.setter.modifiers)
            .filter(m => !modifiers.includes(m));
        const setterModStr = setterMods.length > 0 ? setterMods.join(' ') + ' ' : '';
        
        if (property.setter.hasBody) {
            setterStr = `${setterModStr}set { }`;
        } else {
            setterStr = `${setterModStr}set;`;
        }
    }
    
    const accessors = [getterStr, setterStr].filter(Boolean).join(' ');
    
    return `${annotations}${indent}${modStr}${type} ${property.name} { ${accessors} }`;
}

/**
 * Generate method/constructor signature and body
 */
function generateMethod(method, className, typeKind, indent = '    ') {
    const annotations = formatAnnotations(method.annotations, indent);
    const modifiers = formatModifiers(method.modifiers);
    // Apex interface methods inherit their visibility from the interface.
    const methodModifiers = typeKind === 'INTERFACE'
        ? modifiers.filter(modifier => !VISIBILITY_MODIFIERS.includes(modifier))
        : modifiers;
    const modStr = methodModifiers.length > 0 ? methodModifiers.join(' ') + ' ' : '';

    // Handle constructor
    const isConstructor = method.name === '<init>';

    // Demangle method name to extract clean name and generic return type
    const { cleanName, genericReturnType } = isConstructor
        ? { cleanName: className, genericReturnType: null }
        : demangleMethodName(method.name);

    const methodName = cleanName;

    // Use generic return type if extracted from mangled name, otherwise use JSON type
    let returnType;
    if (isConstructor) {
        returnType = '';
    } else if (genericReturnType) {
        returnType = genericReturnType + ' ';
    } else {
        returnType = formatType(method.returnType) + ' ';
    }

    // Format parameters
    const params = (method.parameters || []).map(param => {
        const paramType = formatType(param.type);
        return `${paramType} ${param.name}`;
    }).join(', ');

    // Generate body - use base type name for default return
    const returnTypeName = genericReturnType || formatType(method.returnType);
    const defaultReturn = getDefaultReturn(returnTypeName);

    let body;
    if (modifiers.includes('abstract') || typeKind === 'INTERFACE') {
        // Abstract methods and interface methods have no body
        return `${annotations}${indent}${modStr}${returnType}${methodName}(${params});`;
    } else if (defaultReturn === null) {
        // void method
        body = '{ }';
    } else {
        body = `{ return ${defaultReturn}; }`;
    }

    return `${annotations}${indent}${modStr}${returnType}${methodName}(${params}) ${body}`;
}

/**
 * Generate inner type (nested class/interface/enum)
 */
function generateInnerType(innerType, indent = '    ') {
    return generateTypeBody(innerType, indent);
}

/**
 * Generate the body of a type (class/interface/enum)
 */
function generateTypeBody(typeStub, indent = '') {
    const innerIndent = indent + '    ';
    const lines = [];
    
    // Annotations
    if (typeStub.annotations && typeStub.annotations.length > 0) {
        typeStub.annotations.forEach(ann => {
            lines.push(`${indent}@${formatAnnotation(ann)}`);
        });
    }
    
    // Type declaration
    const modifiers = formatModifiers(typeStub.modifiers);
    const modStr = modifiers.length > 0 ? modifiers.join(' ') + ' ' : '';
    
    let keyword;
    switch (typeStub.kind) {
        case 'INTERFACE':
            keyword = 'interface';
            break;
        case 'ENUM':
            keyword = 'enum';
            break;
        default:
            keyword = 'class';
    }
    
    // Extract class name (handle trigger naming like "__sfdc_trigger.AccountTrigger")
    const rawClassName = typeStub.name.includes('.')
        ? typeStub.name.split('.').pop() 
        : typeStub.name;
    const className = cleanGenericTypeName(rawClassName);
    
    let declaration = `${indent}${modStr}${keyword} ${className}`;
    
    // Extends (skip if no superClass, or if it's Object, or if name is empty)
    if (typeStub.superClass && typeStub.superClass.name && typeStub.superClass.name !== 'Object') {
        declaration += ` extends ${formatType(typeStub.superClass)}`;
    }
    
    // Implements
    if (typeStub.interfaces && typeStub.interfaces.length > 0) {
        const interfaces = typeStub.interfaces.map(formatType).join(', ');
        declaration += ` implements ${interfaces}`;
    }
    
    lines.push(`${declaration} {`);
    
    // Enum values must be declarations, not static fields.
    const enumValues = typeStub.kind === 'ENUM'
        ? (typeStub.values || typeStub.enumValues || typeStub.enumConstants || typeStub.fields || [])
        : [];
    if (enumValues.length > 0) {
        lines.push(`${innerIndent}${enumValues.map(value => typeof value === 'string' ? value : value.name).join(`,\n${innerIndent}`)}`);
        lines.push('');
    }

    // Fields
    if (typeStub.kind !== 'ENUM' && typeStub.fields && typeStub.fields.length > 0) {
        typeStub.fields.forEach(field => {
            lines.push(generateField(field, innerIndent));
        });
        lines.push('');
    }
    
    // Enum member methods are implicit runtime helpers and are not part of the
    // enum declaration syntax used by generated stubs.
    if (typeStub.kind === 'ENUM') {
        lines.push(`${indent}}`);
        return lines.join('\n');
    }

    // Properties
    if (typeStub.properties && typeStub.properties.length > 0) {
        typeStub.properties.forEach(prop => {
            lines.push(generateProperty(prop, innerIndent));
        });
        lines.push('');
    }
    
    // Methods (filter out clone methods that are auto-generated)
    const methods = (typeStub.methods || []).filter(m => {
        // Static initializers are not callable Apex members and cannot be emitted as methods.
        if (m.name === '<clinit>') {
            return false;
        }
        if (m.name === 'clone' && m.returnType && m.returnType.name === className) {
            return false;
        }
        return true;
    });

    if (methods.length > 0) {
        methods.forEach((method, idx) => {
            lines.push(generateMethod(method, className, typeStub.kind, innerIndent));
            if (idx < methods.length - 1) {
                lines.push('');
            }
        });
    }
    
    // Inner types
    if (typeStub.innerTypes && typeStub.innerTypes.length > 0) {
        lines.push('');
        typeStub.innerTypes.forEach((innerType, idx) => {
            lines.push(generateInnerType(innerType, innerIndent));
            if (idx < typeStub.innerTypes.length - 1) {
                lines.push('');
            }
        });
    }
    
    lines.push(`${indent}}`);
    
    return lines.join('\n');
}

/**
 * Generate a trigger stub
 */
function generateTrigger(typeStub) {
    const lines = [];
    
    // Extract trigger name from "__sfdc_trigger.TriggerName" format
    const triggerName = typeStub.name.includes('.')
        ? typeStub.name.split('.').pop()
        : typeStub.name;
    
    // Get the object type
    const objectType = typeStub.triggerObjectType 
        ? formatType(typeStub.triggerObjectType)
        : 'SObject';
    
    lines.push(`trigger ${triggerName} on ${objectType} (before insert, before update, before delete, after insert, after update, after delete, after undelete) {`);
    
    const indent = '    ';
    
    const hasMembers = (typeStub.fields && typeStub.fields.length > 0) ||
                       (typeStub.properties && typeStub.properties.length > 0) ||
                       (typeStub.methods && typeStub.methods.length > 0);
    
    if (hasMembers) {
        lines.push(`${indent}// Helper class to hold trigger logic`);
        lines.push(`${indent}public class ${triggerName}Handler {`);
        
        const innerIndent = indent + '    ';
        
        if (typeStub.fields && typeStub.fields.length > 0) {
            typeStub.fields.forEach(field => {
                lines.push(generateField(field, innerIndent));
            });
            lines.push('');
        }
        
        if (typeStub.properties && typeStub.properties.length > 0) {
            typeStub.properties.forEach(prop => {
                lines.push(generateProperty(prop, innerIndent));
            });
            lines.push('');
        }
        
        const methods = (typeStub.methods || []).filter(m => m.name !== 'clone');
        if (methods.length > 0) {
            methods.forEach((method, idx) => {
                lines.push(generateMethod(method, `${triggerName}Handler`, 'CLASS', innerIndent));
                if (idx < methods.length - 1) {
                    lines.push('');
                }
            });
        }
        
        lines.push(`${indent}}`);
    }
    
    lines.push('}');
    
    return lines.join('\n');
}

/**
 * Clean generic type parameter syntax from type names
 * Workaround for W-23491682: List/Set/Map returned as "List<T>", "Map<K,V>", etc.
 *
 * @param {string} name - Type name potentially with generic parameters
 * @returns {string} Clean type name without generic parameters
 */
function cleanGenericTypeName(name) {
    let depth = 0;
    let result = '';

    for (const character of name) {
        if (character === '<') {
            depth++;
        } else if (character === '>') {
            if (depth > 0) depth--;
        } else if (depth === 0) {
            result += character;
        }
    }

    return result;
}

/**
 * Get the filename for a type stub
 */
function getFileName(typeStub) {
    let name = typeStub.name;
    if (name.includes('.')) {
        name = name.split('.').pop();
    }

    // Workaround for W-23491682: Clean generic type parameters from name
    // e.g., "List<T>" -> "List", "Map<K,V>" -> "Map"
    name = cleanGenericTypeName(name);

    const ext = typeStub.kind === 'TRIGGER' ? '.trigger' : '.cls';

    return `${name}${ext}`;
}

/**
 * Generate stub for a single type
 */
function generateStub(typeStub) {
    if (typeStub.kind === 'TRIGGER') {
        return generateTrigger(typeStub);
    }
    return generateTypeBody(typeStub);
}

/**
 * Main entry point - accepts JSON data and returns array of stub objects
 * 
 * @param {Object} jsonData - The parsed JSON containing typeStubs array
 * @returns {Array<{filename: string, source: string}>} Array of generated stubs
 */
function generateApexStubs(jsonData) {
    const typeStubs = jsonData.typeStubs || [];
    
    return typeStubs.map(typeStub => ({
        filename: getFileName(typeStub),
        source: generateStub(typeStub)
    }));
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (Node.js)
    module.exports = { generateApexStubs };
} else if (typeof window !== 'undefined') {
    // Browser global
    window.generateApexStubs = generateApexStubs;
}
