import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  @Transform(({ obj }: { obj: { firstName?: string; lastName?: string } }) =>
    `${obj.firstName ?? ''} ${obj.lastName ?? ''}`.trim(),
  )
  fullName!: string;

  @Expose()
  role!: string;

  @Expose()
  createdAt!: Date;
}
