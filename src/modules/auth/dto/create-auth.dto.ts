import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateAuthDto {
    @IsNotEmpty({ message: "email không được để trống" })
    @IsEmail({}, { message: 'email không đúng định dạng' })
    email: string;

    @IsNotEmpty({ message: "password không được để trống" })
    password: string;
}
