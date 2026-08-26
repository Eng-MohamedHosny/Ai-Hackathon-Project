<?php

namespace App\Providers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Route::bind('conversation', function ($value) {
            $conversation = \App\Models\Conversation::find($value);

            if (! $conversation) {
                throw new NotFoundHttpException('Conversation not found.');
            }

            return $conversation;
        });
    }
}
