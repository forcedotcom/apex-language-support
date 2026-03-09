import { Schema } from "effect";

export class ApexParameter extends Schema.Class<ApexParameter>("ApexParameter")({
  name: Schema.String,
  type: Schema.String,
  description: Schema.optional(Schema.String),
}) {}

export class ApexMethod extends Schema.Class<ApexMethod>("ApexMethod")({
  name: Schema.String,
  returnType: Schema.String,
  parameters: Schema.Array(ApexParameter),
  isStatic: Schema.Boolean,
  visibility: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  signature: Schema.String,
}) {}

export class ApexProperty extends Schema.Class<ApexProperty>("ApexProperty")({
  name: Schema.String,
  type: Schema.String,
  isStatic: Schema.Boolean,
  visibility: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
}) {}

export class ApexInnerException extends Schema.Class<ApexInnerException>("ApexInnerException")({
  name: Schema.String,
}) {}

export class ApexConstructor extends Schema.Class<ApexConstructor>("ApexConstructor")({
  parameters: Schema.Array(ApexParameter),
  visibility: Schema.optional(Schema.String),
}) {}

export class ApexClass extends Schema.Class<ApexClass>("ApexClass")({
  name: Schema.String,
  namespace: Schema.String,
  description: Schema.optional(Schema.String),
  superClass: Schema.optional(Schema.String),
  methods: Schema.Array(ApexMethod),
  properties: Schema.Array(ApexProperty),
  constructors: Schema.optional(Schema.Array(ApexConstructor)),
  isInterface: Schema.optional(Schema.Boolean),
  innerExceptions: Schema.optional(Schema.Array(ApexInnerException)),
}) {}

export class ApexEnumValue extends Schema.Class<ApexEnumValue>("ApexEnumValue")({
  name: Schema.String,
  description: Schema.optional(Schema.String),
}) {}

export class ApexEnum extends Schema.Class<ApexEnum>("ApexEnum")({
  name: Schema.String,
  namespace: Schema.String,
  description: Schema.optional(Schema.String),
  values: Schema.Array(ApexEnumValue),
}) {}

export class ApexNamespace extends Schema.Class<ApexNamespace>("ApexNamespace")({
  name: Schema.String,
  classes: Schema.Array(ApexClass),
  enums: Schema.optional(Schema.Array(ApexEnum)),
}) {}
