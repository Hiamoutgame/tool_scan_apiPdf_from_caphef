import { Module } from '@nestjs/common';
import { SupabaseStorageController } from '../controller/supabase-storage.controller';
import { SupabaseStorageService } from '../services/supabase-storage.service';

@Module({
  controllers: [SupabaseStorageController],
  providers: [SupabaseStorageService],
  exports: [SupabaseStorageService],
})
export class StorageModule {}
