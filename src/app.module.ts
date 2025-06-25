import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JwtAuthGuard } from './modules/auth/passport/jwt-auth.guard';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SongsModule } from './modules/songs/songs.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { GenresModule } from './modules/genres/genres.module';
import { LikesModule } from './modules/likes/likes.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FollowersModule } from './modules/followers/followers.module';
import { FollowPlaylistModule } from './modules/follow-playlist/follow-playlist.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthCheckModule } from './modules/health-check/health-check.module';
import { PlaybackModule } from './modules/playback/playback.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
// Import other modules here...

@Module({
  imports: [
    UsersModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          port: configService.get<number>('MAIL_PORT'),
          // ignoreTLS: true,
          secure: configService.get<boolean>('MAIL_SECURE'),
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from: '"MailServiceDATN" <no-reply@localhost>',
        },
        // preview: true,
        template: {
          // dir: process.cwd() + 'mail/templates/',
          dir: join(__dirname, 'mail/templates/'),
          adapter: new HandlebarsAdapter(), // or new PugAdapter() or new EjsAdapter()
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    SongsModule,
    PlaylistsModule,
    GenresModule,
    LikesModule,
    CommentsModule,
    FollowersModule,
    FollowPlaylistModule,
    AdminModule,
    HealthCheckModule,
    PlaybackModule,
    PaymentsModule,
    SubscriptionsModule,
    // Add other modules here...
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
