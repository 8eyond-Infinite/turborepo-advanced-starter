import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StoragePort } from '../../domain/ports/storage.port';
import { JwtAuthGuard } from '../../../iam/auth/application/guards/jwt-auth.guard';

@ApiTags('Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
    constructor(private readonly storagePort: StoragePort) {}

    @Post('upload')
    @HttpCode(HttpStatus.OK)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload a file (Images only, max 5MB)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'File uploaded successfully' })
    @ApiResponse({ status: 400, description: 'Invalid file or validation error' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|gif)$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        const url = await this.storagePort.upload(file, 'avatars');
        return { url };
    }
}
