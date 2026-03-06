import { Effect, Console } from "effect";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ApexClass, ApexEnum, ApexNamespace } from "../types/apex";

export class GenerationError {
  readonly _tag = "GenerationError";
  constructor(readonly message: string, readonly cause?: unknown) {}
}

/** Normalize System.Url to System.URL to match documented all-caps form */
const normalizeUrlType = (type: string): string =>
  type.replace(/\bSystem\.Url\b/g, "System.URL");

/**
 * Generate stub files for all namespaces
 */
export const generateStubs = (
  namespaces: ApexNamespace[],
  outputDir: string
) =>
  Effect.gen(function* () {
    yield* Console.log(`Generating stubs in: ${outputDir}`);

    yield* Effect.forEach(namespaces, (namespace) =>
      generateNamespaceStubs(namespace, outputDir)
    );

    yield* Console.log("Stub generation complete!");
  });

const generateNamespaceStubs = (namespace: ApexNamespace, outputDir: string) =>
  Effect.gen(function* () {
    const namespacePath = join(outputDir, namespace.name);
    yield* Console.log(`Generating namespace: ${namespace.name}`);

    yield* Effect.tryPromise({
      try: () => mkdir(namespacePath, { recursive: true }),
      catch: (error) => new GenerationError(`Failed to create directory: ${namespacePath}`, error),
    });

    yield* Effect.forEach(namespace.classes, (apexClass) =>
      generateClassStub(apexClass, namespacePath)
    );

    yield* Effect.forEach(namespace.enums ?? [], (apexEnum) =>
      generateEnumStub(apexEnum, namespacePath)
    );
  });

const generateClassStub = (apexClass: ApexClass, outputPath: string) =>
  Effect.gen(function* () {
    const filePath = join(outputPath, `${apexClass.name}.cls`);
    const stubContent = generateClassContent(apexClass);

    yield* Effect.tryPromise({
      try: () => writeFile(filePath, stubContent, "utf-8"),
      catch: (error) => new GenerationError(`Failed to write stub file: ${filePath}`, error),
    });

    const kind = apexClass.isInterface ? "interface" : "class";
    yield* Console.log(`  Generated ${kind}: ${apexClass.namespace}.${apexClass.name}`);
  });

const generateEnumStub = (apexEnum: ApexEnum, outputPath: string) =>
  Effect.gen(function* () {
    const filePath = join(outputPath, `${apexEnum.name}.cls`);
    const stubContent = generateEnumContent(apexEnum);

    yield* Effect.tryPromise({
      try: () => writeFile(filePath, stubContent, "utf-8"),
      catch: (error) => new GenerationError(`Failed to write enum stub file: ${filePath}`, error),
    });

    yield* Console.log(`  Generated enum: ${apexEnum.namespace}.${apexEnum.name}`);
  });

const generateClassContent = (apexClass: ApexClass): string => {
  const lines: string[] = [];
  const keyword = apexClass.isInterface ? "interface" : "class";

  if (apexClass.description) {
    lines.push("/**");
    lines.push(` * ${apexClass.description}`);
    lines.push(" */");
  }

  lines.push(`global ${keyword} ${apexClass.name} {`);
  lines.push("");

  for (const ctor of apexClass.constructors ?? []) {
    const vis = ctor.visibility ?? "global";
    const params = ctor.parameters.map((p) => `${normalizeUrlType(p.type)} ${p.name}`).join(", ");
    lines.push(`  ${vis} ${apexClass.name}(${params}) {}`);
    lines.push("");
  }

  for (const prop of apexClass.properties) {
    if (prop.description) {
      lines.push("  /**");
      lines.push(`   * ${prop.description}`);
      lines.push("   */");
    }
    const propVisibility = prop.visibility ?? "global";
    const staticKeyword = prop.isStatic ? "static " : "";
    lines.push(`  ${propVisibility} ${staticKeyword}${normalizeUrlType(prop.type)} ${prop.name};`);
    lines.push("");
  }

  for (const method of apexClass.methods) {
    if (method.description) {
      lines.push("  /**");
      lines.push(`   * ${method.description}`);
      for (const param of method.parameters) {
        lines.push(`   * @param ${param.name} ${param.description || ""}`);
      }
      if (method.returnType !== "void") {
        lines.push(`   * @return ${normalizeUrlType(method.returnType)}`);
      }
      lines.push("   */");
    }

    const methodVisibility = method.visibility ?? "global";
    const staticKeyword = method.isStatic ? "static " : "";
    const returnTypeNorm = normalizeUrlType(method.returnType);
    const params = method.parameters.map((p) => `${normalizeUrlType(p.type)} ${p.name}`).join(", ");

    if (apexClass.isInterface) {
      lines.push(`  ${staticKeyword}${returnTypeNorm} ${method.name}(${params});`);
    } else {
      lines.push(`  ${methodVisibility} ${staticKeyword}${returnTypeNorm} ${method.name}(${params}) {}`);
    }
    lines.push("");
  }

  // Emit inner exception classes as nested class definitions
  for (const inner of (apexClass.innerExceptions ?? [])) {
    lines.push(`  global class ${inner.name} extends Exception {}`);
    lines.push("");
  }

  lines.push("}");
  return lines.join("\n");
};

const generateEnumContent = (apexEnum: ApexEnum): string => {
  const lines: string[] = [];

  if (apexEnum.description) {
    lines.push("/**");
    lines.push(` * ${apexEnum.description}`);
    lines.push(" */");
  }

  lines.push(`global enum ${apexEnum.name} {`);

  if (apexEnum.values.length > 0) {
    lines.push(
      ...apexEnum.values.map((v, i) => `  ${v.name}${i < apexEnum.values.length - 1 ? "," : ""}`)
    );
  }

  lines.push("}");
  return lines.join("\n");
};
