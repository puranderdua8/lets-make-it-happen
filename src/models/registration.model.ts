import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const registrationSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// One registration per user per event, enforced atomically by the database.
registrationSchema.index({ event: 1, user: 1 }, { unique: true });
registrationSchema.index({ user: 1 });

export type Registration = InferSchemaType<typeof registrationSchema>;
export type RegistrationDocument = HydratedDocument<Registration>;

export const RegistrationModel = model('Registration', registrationSchema);
