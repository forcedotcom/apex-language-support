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
    // Look for _r followed by a type name (capital letter)
    const match = mangledName.match(/^(.+?)_r([A-Z].*)$/);
    
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
        
        // Find where the return type ends (at _0, _1 etc. or end of string)
        const paramMarkerMatch = typeInfo.match(/^(.+?\$\$r)(_\d+.*)?$/);
        
        if (paramMarkerMatch) {
            const returnTypePart = paramMarkerMatch[1];
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
    if (!typeRef) return 'Object';
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
        let result = ann.name;
        
        // Add parameters if present and non-empty
        if (ann.parameters && typeof ann.parameters === 'object') {
            const params = Object.entries(ann.parameters)
                .filter(([key, value]) => value !== null && value !== undefined)
                .map(([key, value]) => `${key}=${value}`)
                .join(', ');
            
            if (params) {
                result += `(${params})`;
            }
        }
        
        return result;
    }
    
    return String(ann);
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
    const modStr = modifiers.length > 0 ? modifiers.join(' ') + ' ' : '';

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
    const returnTypeName = method.returnType ? method.returnType.name : 'void';
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
            lines.push(`${indent}@${ann}`);
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
    const className = typeStub.name.includes('.') 
        ? typeStub.name.split('.').pop() 
        : typeStub.name;
    
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
    
    // Fields
    if (typeStub.fields && typeStub.fields.length > 0) {
        typeStub.fields.forEach(field => {
            lines.push(generateField(field, innerIndent));
        });
        lines.push('');
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
    // Remove generic type parameters: "List<T>" -> "List", "Map<K,V>" -> "Map"
    return name.replace(/<[^>]+>/g, '');
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

    // Only add namespace prefix if it's not the default System namespace
    // System namespace types should not have a prefix in their filename
    if (typeStub.namespacePrefix && typeStub.namespacePrefix !== 'System') {
        name = `${typeStub.namespacePrefix}_${name}`;
    }

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
