import { ApiProperty } from "@nestjs/swagger";
export class ApiResponseDto<T> {

    @ApiProperty({ example: 200, description: 'Status code of the response' })
    statusCode: number;

    @ApiProperty({ example: 'Success', description: 'Message of the response' })
    message: string;

    @ApiProperty({ description: 'Data of the response' })
    data?: T;
    
    constructor(statusCode: number, message: string, data?: T, error: any = null) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
}
